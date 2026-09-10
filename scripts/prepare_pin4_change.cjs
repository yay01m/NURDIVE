// Prepare reviewable files without changing the running application.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const target='tmp/pin4-review';fs.mkdirSync(target,{recursive:true});
let s=fs.readFileSync('auth.js','utf8');
s=s.replace("(register?pin.length<12:","(register?!/^[0-9]{4}$/.test(pin):");
s=s.replace('12文字以上のパスワードを入力してください。','4桁の数字を入力してください。以前の長いパスワードもログインに使えます。');
s=s.replaceAll('パスワード','コード').replace('以前の4桁コードも使えます。','以前の長いパスワードも使えます。');
s=s.replace("$('#loginPin').autocomplete", "$('#loginPin').autocomplete");
new vm.Script(s);fs.writeFileSync(path.join(target,'auth.js'),s);
s=fs.readFileSync('mypage.js','utf8');
s=s.replaceAll('新しいパスワード（12文字以上）','新しい4桁コード').replace('pin&&(pin.length<12||new TextEncoder().encode(pin).length>72)','pin&&!/^[0-9]{4}$/.test(pin)').replace('パスワードは12文字以上・72バイト以内で入力してください。','4桁の数字を入力してください。');
s=s.replace('id="newPin" type="password" maxlength="64"','id="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"');
new vm.Script(s);fs.writeFileSync(path.join(target,'mypage.js'),s);
fs.copyFileSync('setup/restore-four-digit-pin.sql',path.join(target,'restore-four-digit-pin.sql'));
console.log('Prepared PIN4 UI and database migration; live files unchanged.');
