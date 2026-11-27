/* Test için sahte hesap (Firebase yerine). Sadece tools/test.sh kullanır, uygulamaya yüklenmez. */
window.SYNC=(()=>{let user=null,ls=[],ph={},n=0;const emit=()=>ls.forEach(f=>f(user));
return {enabled:true,init:()=>Promise.resolve(),onUser(f){ls.push(f);setTimeout(()=>f(user),50)},user:()=>user,msg:e=>e&&e.message||'hata',
async login(){user={uid:localStorage.getItem('T_UID')||'u1',email:'t@t'};emit()},google(){return this.login()},signup(){return this.login()},reset(){},async logout(){user=null;emit()},
async pull(){return null},async pushNow(){},push(){},
async addPhoto(t,p,th,img){const id='x'+(++n);ph[id]={t,p,th,img};window.T_SIZES=[th.length,img.length];return id},
async listPhotos(p){return Object.entries(ph).filter(([k,v])=>v.p===p).map(([id,v])=>({id,t:v.t,p:v.p,th:v.th}))},
async fullPhoto(id){return ph[id].img},async delPhoto(id){delete ph[id]},async wipePhotos(){},async remove(){}}})();
