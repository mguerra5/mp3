
function parseJSON(s) {
  if (!s) {
    return undefined;
  }
  if (s.trim() === '') {
    return undefined;
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    const err = new Error("JSON couldn't parse.");
    err.status = 400;
    throw err;
  }
}

function sendError(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

function limitInts(i, name) {
  if (i === undefined || i === null || String(i).trim() === '') {
    return undefined;
  }
  const n = Number(i);
  if (!Number.isInteger(n) || n < 0) {
    throw sendError(`${name} must be a non-negative integer value.`);
  }
  return n;
}

function createQuery(req, { resource }) {
  const where = parseJSON(req.query.where) ?? {};
  const sort = parseJSON(req.query.sort);
  const select = parseJSON(req.query.select ?? req.query.filter);
  const skip = limitInts(req.query.skip, 'skip');
  const limit =
    limitInts(req.query.limit, 'limit') ??
    (resource === 'tasks' ? 100 : undefined);
  const count = String(req.query.count ?? '').toLowerCase() === 'true';

  return { where, sort, select, skip, limit, count };
}

module.exports = { parseJSON, limitInts, createQuery };
