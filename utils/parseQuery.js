function parseJSON(s) {
  if (!s) {
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


