const getNama = (_userDbA) => {
  const _nama = _userDbA?.rl?.name;
  if (_nama == undefined || _nama == '') return undefined;
  return _nama;
};

module.exports = {
  getNama,
};
