import QUnit from 'qunit';

QUnit.extend(QUnit.assert, {
  asyncThrows: async function(func, regex, message = '') {
    let f = () => {};

    try {
      await func();
    } catch (e) {
      f = () => {
        throw e;
      };
    } finally {
      QUnit.assert.throws(f, regex, message);
    }
  },
});
