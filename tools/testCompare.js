const bcrypt = require('bcryptjs');

(async () => {
  const plain = '1234'; // la que estás ingresando
  const hash  = '$2b$10$SvZEjEq6tTJTAGwr13aE6.E5oPyn1RC0zGR5PwFB7rfSY9sUJSsOa'; // el de tu BD
  const ok = await bcrypt.compare(plain, hash);
  console.log('COMPARE:', ok); // true = hash correcto
})();
