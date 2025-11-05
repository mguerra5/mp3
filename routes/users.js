
var User = require('../models/user.js')
var Task = require('../models/task.js')
var { createQuery } = require('../utils/parseQuery.js')
var router = require('express').Router()


  router.get('/', async function(req, res, next) {
    try {
     // console.log("RAW REQ.QUERY.SORT:", req.query.sort);
      const q = createQuery(req, { resource: 'users' });
      // console.log("PARSED Q.SORT:", q.sort);
      if (q.count) {
        const n = await User.countDocuments(q.where);
        return res.json({ message: 'OK', data: n });
      }
      let curr = User.find(q.where);
      if (q.sort) {
        curr = curr.sort(q.sort);
      }
      if (q.select) {
        curr = curr.select(q.select);
      }
      if (q.skip) {
        curr = curr.skip(q.skip);
      }
      if (q.limit !== undefined) {
        curr = curr.limit(q.limit);
      }
      const rows = await curr;
      res.json({ message: 'OK', data: rows });
    } catch (e) {
      next(e);
    }
  });

  router.post('/', async function(req, res, next) {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ message: 'Need to provide name AND email', data: null })
      }
      const user = await User.create({ name, email });
      res.status(201).json({ message: 'Created', data: user });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(400).json({ message: 'email already exists', data: null });
      }
      next(e);
    }
  });

  router.get('/:id', async function(req, res, next) {
    try {
      const { select } = createQuery(req, { resource: 'users' });
      const user = await User.findById(req.params.id).select(select || {});
      if (!user) {
        return res.status(404).json({ message: 'No User exists for this ID.', data: null });
      }
      res.json({ message: 'OK', data: user });
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', async function(req, res, next) {
    try {
      const id = req.params.id;
      const exists = await User.findById(id);
      if (!exists) {
        return res.status(404).json({ message: 'user does not exist for this ID.', data: null })
      }
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ message: 'need to provide name AND email', data: null })
      }
      let pendingTasks = req.body.pendingTasks || [];
      if (!Array.isArray(pendingTasks)) {
        pendingTasks = [pendingTasks];
      }
      pendingTasks = pendingTasks.map(String);

      const nextUser = await User.findByIdAndUpdate(
        id,
        { _id: id, name, email, pendingTasks, dateCreated: exists.dateCreated },
        { new: true, overwrite: true, runValidators: true }
      );

      const existingTasks = new Set(exists.pendingTasks.map(String));
      const newTasks = new Set(pendingTasks);

      const removed = [...existingTasks].filter(t => !newTasks.has(t));
      const added = [...newTasks].filter(t => !existingTasks.has(t));

      if (removed.length > 0) {
        await Task.updateMany(
          { _id: { $in: removed }, assignedUser: id },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
        );
      }
      if (added.length > 0) {
        await Task.updateMany(
          { _id: { $in: added } },
          { $set: { assignedUser: String(id), assignedUserName: name } }
        );
      }
      res.json({ message: 'UPDATED', data: nextUser });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(400).json({ message: 'Email already exists', data: null });
      }
      next(e);
    }
  });

  router.delete('/:id', async function(req, res, next) {
    try {
      const id = req.params.id;
      await Task.updateMany(
        { assignedUser: id },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
      const gone = await User.findByIdAndDelete(id);
      if (!gone) {
        return res.status(404).json({ message: 'User not found', data: null });
      }
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

module.exports = router;





