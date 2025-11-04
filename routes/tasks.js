
var Task = require('../models/task');
var User = require('../models/user');
var { createQuery } = require('../utils/parseQuery');

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return !!v;
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

module.exports = function(router) {
  router.get('/', async function(req, res, next) {
    try {
      const q = createQuery(req, { resource: 'tasks' });
      if (q.count) {
        const n = await Task.countDocuments(q.where);
        return res.json({ message: 'OK', data: n });
      }
      let cur = Task.find(q.where);
      if (q.sort) cur = cur.sort(q.sort);
      if (q.select) cur = cur.select(q.select);
      if (q.skip) cur = cur.skip(q.skip);
      if (q.limit !== undefined) cur = cur.limit(q.limit);
      const rows = await cur.lean().exec();
      return res.json({ message: 'OK', data: rows });
    } catch (e) { next(e); }
  });

  router.post('/', async function(req, res, next) {
    try {
      let { name, description, deadline, completed, assignedUser } = req.body;
      if (!name || !deadline) {
        return res.status(400).json({ message: 'name and deadline required', data: null });
      }
      const deadlineDate = new Date(deadline);
      if (!isValidDate(deadlineDate)) {
        return res.status(400).json({ message: 'deadline must be a valid date', data: null });
      }
      completed = toBool(completed);
      let assignedUserName = 'unassigned';
      if (assignedUser) {
        const u = await User.findById(assignedUser).lean().exec();
        if (!u) return res.status(400).json({ message: 'assignedUser does not exist', data: null });
        assignedUserName = u.name;
      } else {
        assignedUser = '';
      }
      const t = await Task.create({
        name,
        description: description || '',
        deadline: deadlineDate,
        completed,
        assignedUser,
        assignedUserName
      });
      if (assignedUser && !t.completed) {
        await User.updateOne({ _id: assignedUser }, { $addToSet: { pendingTasks: String(t._id) } });
      }
      return res.status(201).json({ message: 'Created', data: t });
    } catch (e) { next(e); }
  });

  router.get('/:id', async function(req, res, next) {
    try {
      const { select } = createQuery(req, { resource: 'tasks' });
      const task = await Task.findById(req.params.id).select(select || {}).lean().exec();
      if (!task) return res.status(404).json({ message: 'Task not found', data: null });
      return res.json({ message: 'OK', data: task });
    } catch (e) { next(e); }
  });

  router.put('/:id', async function(req, res, next) {
    try {
      const id = req.params.id;
      const old = await Task.findById(id).lean().exec();
      if (!old) return res.status(404).json({ message: 'Task not found', data: null });
      let { name, description, deadline, completed, assignedUser } = req.body;
      if (!name || !deadline) {
        return res.status(400).json({ message: 'name and deadline required', data: null });
      }
      const deadlineDate = new Date(deadline);
      if (!isValidDate(deadlineDate)) {
        return res.status(400).json({ message: 'deadline must be a valid date', data: null });
      }
      completed = toBool(completed);
      let assignedUserName = 'unassigned';
      if (assignedUser) {
        const u = await User.findById(assignedUser).lean().exec();
        if (!u) return res.status(400).json({ message: 'assignedUser does not exist', data: null });
        assignedUserName = u.name;
      } else {
        assignedUser = '';
      }
      const nextTask = await Task.findByIdAndUpdate(
        id,
        {
          _id: id,
          name,
          description: description || '',
          deadline: deadlineDate,
          completed,
          assignedUser,
          assignedUserName,
          dateCreated: old.dateCreated
        },
        { new: true, overwrite: true, runValidators: true }
      ).exec();
      const tid = String(id);
      const oldUserId = old.assignedUser;
      const newUserId = nextTask.assignedUser;
      if (oldUserId && oldUserId !== newUserId) {
        await User.updateOne({ _id: oldUserId }, { $pull: { pendingTasks: tid } });
      }
      if (newUserId && !nextTask.completed) {
        await User.updateOne({ _id: newUserId }, { $addToSet: { pendingTasks: tid } });
      }
      if (nextTask.completed && newUserId) {
        await User.updateOne({ _id: newUserId }, { $pull: { pendingTasks: tid } });
      }
      return res.json({ message: 'Updated', data: nextTask });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async function(req, res, next) {
    try {
      const old = await Task.findById(req.params.id).lean().exec();
      if (!old) return res.status(404).json({ message: 'Task not found', data: null });
      if (old.assignedUser) {
        await User.updateOne({ _id: old.assignedUser }, { $pull: { pendingTasks: String(old._id) } });
      }
      await Task.deleteOne({ _id: old._id }).exec();
      return res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
};
