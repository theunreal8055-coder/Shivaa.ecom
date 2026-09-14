import { boot, wait, until, click } from './harness.mjs';
const { window, doc } = await boot('#/');
await wait(300);
window.Shivaa.openLogin('account');
await until(() => doc.getElementById('shvPhoneIn'), 6000);
doc.getElementById('shvPhoneIn').value = '9876543210';
click(window, doc.getElementById('shvPhoneBtn'));
const got = await until(() => doc.getElementById('shvOtp'), 6000);
console.log('otp step reached:', !!got);
await wait(700);
console.log('chan count at otp step:', doc.querySelectorAll('.v107-chan').length);
const otp = doc.getElementById('shvOtp');
if (otp) {
  console.log('parent chain:', otp.parentElement.className, '<', otp.parentElement.parentElement.className);
  console.log('parent marked:', !!otp.parentElement.__v107chan);
  console.log('snippet:', otp.parentElement.innerHTML.slice(0, 260).replace(/\s+/g, ' '));
}
window.close();
process.exit(0);
