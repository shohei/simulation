//自作の数学ライブラリ
//3次元ベクトル、3×3行列、クォータニオン、乱数
//swgMath.js

var flagQuaternion = true;
var DEG_TO_RAD = Math.PI / 180.0;
var RAD_TO_DEG = 180.0 / Math.PI;

/******************************************************
  3次元ベクトル
*******************************************************/
//コンストラクタ
function Vector3(x, y, z) 
{
  if(typeof x === 'number' && typeof y === 'number' && typeof z === 'number' )
  {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  else
  {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
}
//---------------------------------------------
Vector3.prototype.copy = function(v)
{
  if(typeof v === 'object')
  {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }
  else
  {
    console.log("Vector3 ERROR --- copy()の 引数がベクトルでない！");
  }
}
//---------------------------------------------------
//ベクトル加算
Vector3.prototype.add = function(v)
{
  if(typeof v === 'object')
  {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }
  else
  {
    console.log("Vector3 ERROR --- add()の 引数がベクトルでない！");
  }
}
//------------------------------------------------------
//ベクトルの加算
//引数のベクトル自身は変化しない
function add(a, b)
{
  if(typeof a === 'object' && typeof b === 'object')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.add(b);
    return c;
  }
  else 
  {
    console.log("Vector3 ERROR --- add()の 引数がベクトルでない！");
  }
}
//--------------------------------------------------------
//ベクトルの減算
Vector3.prototype.sub = function(v)
{
  if(typeof v === 'object')
  {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }
  else
  {
    console.log("Vector3 ERROR --- sub()の 引数がベクトルでない！");
  }
}
//----------------------------------------------------------
//ベクトルの減算
//引数のベクトル自身は変化しない
function sub(a, b)
{

  if(typeof a === 'object' && typeof b === 'object')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.sub(b);
    return c;
  }
  else
  {
    console.log("Vector3 ERROR --- sub()の 引数がベクトルでない！");
  }
}
//----------------------------------------------------------
//ベクトルの乗算
Vector3.prototype.mul = function(a)
{
  if(typeof a === 'number')//スカラ乗算
  {//scalar
    this.x *= a;
    this.y *= a;
    this.z *= a;
  }
  else if(typeof a == 'object')//ベクトルどうしの乗算
  {
    this.x *= a.x;
    this.y *= a.y;
    this.z *= a.z;
  }
}
//----------------------------------------------------------
//ベクトルの乗算
//引数のベクトル自身は変化しない
function mul(a, b)
{
  if(typeof a === 'number' && typeof b === 'object')
  {
    var c = new Vector3(b.x, b.y, b.z);
    c.mul(a);
  }
  else if(typeof a === 'object' && typeof b === 'number')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.mul(b);
  }
  else if(typeof a === 'object' && typeof b === 'object')//ベクトルどうしの乗算
  {
    var c = new Vector3();
    c.x = a.x * b.x;
    c.y = a.y * b.y;
    c.z = a.z * b.z;
  }
  return c;
}
//------------------------------------------------------------
//スカラ除算
Vector3.prototype.div = function(s)
{
  if(typeof s === 'number' && s != 0)//スカラ除算
  {
    this.x /= s;
    this.y /= s;
    this.z /= s;
  }
  else
  {
    console.log("Vector3 ERROR --- div()の 引数がスカラでない，または0です！");
  }
}
//-------------------------------------------------------------
//スカラ除算
//引数自身は変化しない
function div(a, s)
{
  if(typeof a === 'object' && typeof s === 'number')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.div(s);
    return c;
  }
  else
  {
    console.log("Vector3 ERROR --- div()の 引数が間違い！");
  }
}
//-------------------------------------------------------------
//ベクトルの大きさ
function mag(v)
{
  var s = v.x * v.x + v.y * v.y + v.z * v.z;
  return Math.sqrt(s);
}
//-------------------------------------------------------------
//ベクトルの大きさの二乗
function mag2(v)
{
  var s = v.x * v.x + v.y * v.y + v.z * v.z;
  return s;
}
//-------------------------------------------------------------
//ベクトル間距離
function distance(a, b)
{
  var c = new Vector3(a.x, a.y, a.z);
  c.sub(b);
  return mag(c);
}
//------------------------------------------------------------
//ベクトル間2乗距離
function distance2(a, b)
{
  var c = new Vector3(a.x, a.y, a.z);
  c.sub(b);
  return mag2(c);
}
//-------------------------------------------------------
//内積
function dot(a, b)
{
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
//-------------------------------------------------------- 
Vector3.prototype.reverse = function()
{
  var x = this.x; var y = this.y; var z = this.z;
  this.x = -x; this.y = -y; this.z = -z;
}
//---------------------------------------------------------
function reverse(v)
{
  if(typeof v !== 'object'){
    console.log("reverse()の引数がベクトルでない　!"); return;
  }
  return new Vector3(-v.x, -v.y, -v.z);
}
//---------------------------------------------------------
//外積
function cross(a, b)
{
  if(typeof a !== 'object' || typeof b !== 'object'){
    console.log("cross()の引数がベクトルでない　!"); return;
  }
  
  var c = new Vector3();
  c.x = a.y * b.z - a.z * b.y;
  c.y = a.z * b.x - a.x * b.z;
  c.z = a.x * b.y - a.y * b.x;
  return c;
}
//--------------------------------------------------------
//自身の単位ベクトル
Vector3.prototype.norm = function()
{
  var eps = 0.000001;
  var x = this.x; var y = this.y; var z = this.z;
  var s = Math.sqrt(x*x + y*y + z*z);
  if(s <= eps) s = 1.0;
  this.x = x/s; this.y = y/s; this.z = z/s;

  if(Math.abs(Math.abs(x) < eps)) this.x = 0.0;
  if(Math.abs(Math.abs(y) < eps)) this.y = 0.0;
  if(Math.abs(Math.abs(z) < eps)) this.z = 0.0;

}
//--------------------------------------------------------
//単位ベクトルを返す。自身は変化しない
function norm(a)
{
  if(typeof a === 'object')
  {
    var b = new Vector3(a.x, a.y, a.z);
    b.norm();
    return b;
  }
  else
  {
    console.log("Vector3 ERROR --- norm()の 引数が間違い！");
  }
}
//--------------------------------------------------------
//単位ベクトルを返す。自身は変化しない
//ｚ成分を0とした正規化
function normXY(a)
{
  if(typeof a === 'object')
  {
    var b = new Vector3();
    b.copy(a);
    b.norm();
    return b;
  }
  else
  {
    console.log("Vector3 ERROR --- norm()の 引数が間違い！");
  }
}
//--------------------------------------------------------
//a->bの単位ベクトルを返す
function direction(a, b)
{
　if(typeof a ==='object' && typeof b === 'object')
  {
    var c = new Vector3();
    c.copy(b);
    c.sub(a);
    c.norm();
    return c;
  }
  else
  {
    console.log("Vector3 ERROR --- direction()の 引数が間違い！");
  }
}
  
//---------------------------------------------------------
//x軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotX_deg = function(ang)
{//ang:deg
  var y = this.y; var z = this.z;

  this.y = y * Math.cos(DEG_TO_RAD * ang) - z * Math.sin(DEG_TO_RAD * ang);
  this.z = y * Math.sin(DEG_TO_RAD * ang) + z * Math.cos(DEG_TO_RAD * ang);
}
//---------------------------------------------------------
//y軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotY_deg = function(ang)
{
  var x = this.x; var z = this.z;

  this.x =  x * Math.cos(DEG_TO_RAD * ang) + z * Math.sin(DEG_TO_RAD * ang);
  this.z =- x * Math.sin(DEG_TO_RAD * ang) + z * Math.cos(DEG_TO_RAD * ang);
}
//-----------------------------------------------------------
//z軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotZ_deg = function(ang)
{
  var x = this.x; var y = this.y;
  this.x = x * Math.cos(DEG_TO_RAD * ang) - y * Math.sin(DEG_TO_RAD * ang);
  this.y = x * Math.sin(DEG_TO_RAD * ang) + y * Math.cos(DEG_TO_RAD * ang);
}
//------------------------------------------------------------
//ｘ軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotX_rad = function(ang)
{
  var y = this.y; var z = this.z;

  this.y = y * Math.cos(ang) - z * Math.sin(ang);
  this.z = y * Math.sin(ang) + z * Math.cos(ang);
}
//-------------------------------------------------------------
//ｙ軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotY_rad = function(ang)
{
  var x = this.x; var z = this.z;

  this.x =  x * Math.cos(ang) + z * Math.sin(ang);
  this.z =- x * Math.sin(ang) + z * Math.cos(ang);
}
//-------------------------------------------------------------
//ｚ軸回転後のベクトルを返す(自身が変化する）
Vector3.prototype.rotZ_rad = function(ang)
{
  var x = this.x; var y = this.y;
  this.x = x * Math.cos(ang) - y * Math.sin(ang);
  this.y = x * Math.sin(ang) + y * Math.cos(ang);
}
//-------------------------------------------------------------
//ｚ軸回転後のベクトルを返す(自身は変化しない）
function rotZ_rad(a, ang)
{
  var b = new Vector3(a.x, a.y, a.z);
  b.rotZ_rad(ang);
  return b;
}
//-------------------------------------------------------------
//第1引数のベクトルを中心とした回転
Vector3.prototype.rotX_radC = function(a, ang)
{
  var xx, yy, zz;

  xx = this.x ; yy = this.y - a.y; zz = this.z - a.z;
  this.x = xx;
  this.y = yy * Math.cos(ang) - zz * Math.sin(ang) + a.y;
  this.z = yy * Math.sin(ang) + zz * Math.cos(ang) + a.z;
}

//-------------------------------------------------------------
//第1引数のベクトルを中心とした回転
Vector3.prototype.rotY_radC = function(a, ang)
{
  var xx, yy, zz;

  xx = this.x - a.x; yy = this.y; zz = this.z - a.z;
  this.x = xx * Math.cos(ang) + zz * Math.sin(ang) + a.x;
  this.y = yy;
  this.z =-xx * Math.sin(ang) + zz * Math.cos(ang) + a.z;
}
//-------------------------------------------------------------
//第1引数のベクトルを中心とした回転
Vector3.prototype.rotZ_radC = function(a, ang)
{
  var xx, yy, zz;

  xx = this.x - a.x; yy = this.y - a.y; zz = this.z;
  this.x = xx * Math.cos(ang) - yy * Math.sin(ang) + a.x;
  this.y = xx * Math.sin(ang) + yy * Math.cos(ang) + a.y;
  this.z = zz;
}

//-----------------------------------------------------------------
//オイラー角で回転(elrはdeg）
function rotate(v, elr)
{
  v.rotX_deg(elr.x);
  v.rotY_deg(elr.y);
  v.rotZ_deg(elr.z);
  return v;
}

//-------------------------------------------------------------
//ベクトルa,b間の角度(rad)
function getAngle_rad( a, b)
{
  var ang;
  var c = (a.x*b.x+a.y*b.y+a.z*b.z)/(mag(a)*mag(b));
  if(c >= 1.0) ang = 0.0;
  else if (c <= -1.0) ang = Math.PI;
  else ang = Math.acos(c);
  return ang;//rad単位で返す
}

//--------------------------------------------------------------
//ベクトルa,b間の角度(deg)
function getAngle_deg( a, b)
{
  var ang;
  var c = (a.x*b.x+a.y*b.y+a.z*b.z)/(mag(a)*mag(b));
  if(c >= 1.0) ang = 0.0;
  else if (c <= -1.0) ang = Math.PI;
  else ang = Math.acos(c);
  return ang * RAD_TO_DEG;//度単位で返す
}

//---------------------------------------------------------------
//基本姿勢でa->bの軸がｘ軸方向であるオブジェクトのオイラー角(deg)
function getEulerX(a, b)
{
    var cx, cy, cz, len;
    var e = new Vector3();
    cx = b.x - a.x;
    cy = b.y - a.y;
    cz = b.z - a.z;
    len = distance(a, b);
    e.x = 0.0;
    if(cz >= len) e.y = -90.0;
    else if(cz <= -len) e.y = 90.0;
    else e.y = - Math.asin(cz / len) * RAD_TO_DEG;
    if(Math.abs(cx) <= 0.0001 && Math.abs(cy) <= 0.0001) e.z = 0.0;
    else e.z = Math.atan2(cy, cx) * RAD_TO_DEG;
    return e;
}
//-----------------------------------------------------------------
//基本姿勢でa->bの軸がz軸方向であるオブジェクトのオイラー角(deg)
function getEulerZ(a, b)
{
    var cx, cy, cz, len;
    var e = new Vector3();
    cx = b.x - a.x;
    cy = b.y - a.y;
    cz = b.z - a.z;
    len = distance(a, b);
    
    e.z = 0.0;
    if(cy >= len) e.x = -90.0;
    else if(cy <= -len) e.x = 90.0;
    else e.x = -Math.asin(cy / len) * RAD_TO_DEG;
    if(Math.abs(cx) <= 0.0001 && Math.abs(cz) <= 0.0001) e.y = 0.0;
    else e.y = Math.atan2(cx, cz) * RAD_TO_DEG;
    return e;
}

/*****************************************************************
    3×3行列
******************************************************************/
//コンストラクタ（引数が空白であれば単位行列で初期化）
function Matrix3(e0, e1, e2, e3, e4, e5, e6, e7, e8)
{
  this.e = [
     1,0,0, 　
     0,1,0, 
     0,0,1 
  ];

  if(typeof e0 === 'number' && typeof e1 === 'number' && typeof e2 === 'number' &&
     typeof e3 === 'number' && typeof e4 === 'number' && typeof e5 === 'number' &&
     typeof e6 === 'number' && typeof e7 === 'number' && typeof e8 === 'number' )
  {
    this.e[0] = e0; this.e[1] = e1; this.e[2] = e2;
    this.e[3] = e3; this.e[4] = e4; this.e[5] = e5;
    this.e[6] = e6; this.e[7] = e7; this.e[8] = e8;
  }
}
//-----------------------------------------------------------------
//行列要素をセットする。
Matrix3.prototype.set = function(e0, e1, e2, e3, e4, e5, e6, e7, e8) 
{
  this.e[0] = e0;
  this.e[1] = e1;
  this.e[2] = e2;
  this.e[3] = e3;
  this.e[4] = e4;
  this.e[5] = e5;
  this.e[6] = e6;
  this.e[7] = e7;
  this.e[8] = e8;
}
//---------------------------------------------------
// 渡された行列の要素をコピーする。
Matrix3.prototype.copy = function(m) 
{
  var i, s, d;

  s = m.e;
  d = this.e;

  if (s === d) {
    return;
  }
    
  for (i = 0; i < 9; ++i) {
    d[i] = s[i];
  }
}
//-------------------------------------------------------------
//行列式
function det(m)
{
  var d = m.e[0]*m.e[4]*m.e[8] + m.e[1]*m.e[5]*m.e[6] + m.e[2]*m.e[7]*m.e[3]
        - m.e[0]*m.e[7]*m.e[5] - m.e[1]*m.e[3]*m.e[8] - m.e[6]*m.e[4]*m.e[2] ;
  return d;
}
//----------------------------------------------------------------
//逆行列
Matrix3.prototype.inverse = function()
{
    var e = this.e;
    var d = det(this);
    if( d == 0.0 ) {
			 console.log("逆行列を求めることができません！"+ "br");
       d = 1.0;
    }

    var c = [];
    c[0] =  (e[4]*e[8]-e[5]*e[7])/d;
    c[1] = -(e[1]*e[8]-e[2]*e[7])/d;
    c[2] =  (e[1]*e[5]-e[2]*e[4])/d;
    c[3] = -(e[3]*e[8]-e[5]*e[6])/d;
    c[4] =  (e[0]*e[8]-e[2]*e[6])/d;
    c[5] = -(e[0]*e[5]-e[2]*e[3])/d;
    c[6] =  (e[3]*e[7]-e[4]*e[6])/d;
    c[7] = -(e[0]*e[7]-e[1]*e[6])/d;
    c[8] =  (e[0]*e[4]-e[1]*e[3])/d;
    
    for(var i = 0; i < 9; i++) this.e[i] = c[i];
}

//----------------------------------------------------------------------------
//ベクトルを右から掛ける
//結果はVector3
function mulMV(m, v)
{
  var e = m.e;
  var u = new Vector3();
  u.x = e[0]*v.x + e[1]*v.y + e[2]*v.z;
  u.y = e[3]*v.x + e[4]*v.y + e[5]*v.z;
  u.z = e[6]*v.x + e[7]*v.y + e[8]*v.z;
  return u;
}
//----------------------------------------------------------------------------
//ベクトルを左から掛ける
//結果はVector3
function mulVM(v, m)
{
  var e = m.e;
  var u = new Vector3();
  u.x = e[0]*v.x + e[3]*v.y + e[6]*v.z;
  u.y = e[1]*v.x + e[4]*v.y + e[7]*v.z;
  u.z = e[2]*v.x + e[5]*v.y + e[8]*v.z;
  return u;
}
//-------------------------------------------------------------
//行列と行列の乗算(結果は行列）
function mulMM(m1, m2)
{
  var a = m1.e;
  var b = m2.e;
  var m = new Matrix3();
  m.e[0] = a[0]*b[0] + a[1]*b[3] + a[2]*b[6]; 
  m.e[1] = a[0]*b[1] + a[1]*b[4] + a[2]*b[7];
  m.e[2] = a[0]*b[2] + a[1]*b[5] + a[2]*b[8];
  m.e[3] = a[3]*b[0] + a[4]*b[3] + a[5]*b[6]; 
  m.e[4] = a[3]*b[1] + a[4]*b[4] + a[5]*b[7]; 
  m.e[5] = a[3]*b[2] + a[4]*b[5] + a[5]*b[8]; 
  m.e[6] = a[6]*b[0] + a[7]*b[3] + a[8]*b[6]; 
  m.e[7] = a[6]*b[1] + a[7]*b[4] + a[8]*b[7]; 
  m.e[8] = a[6]*b[2] + a[7]*b[5] + a[8]*b[8]; 
  return m;
}
/**************************************************************
    クォータニオン(四元数） 
    定義式： q = s + ix + jy + kz
***************************************************************/
//コンストラクタ
function Quaternion(s, x, y, z)
{
  if(typeof s === 'number' && typeof x === 'number' && typeof y === 'number' && typeof z === 'number' )
  {
    this.s = s;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  else//空白
  {
    this.s = 1;
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
}
//---------------------------------------------
//渡されたクォータニオンの要素をコピーする
Quaternion.prototype.copy = function(q)
{
  if(typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    this.s = q.s;
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
  }
  else
  {
    console.log("Quaternion ERROR --- copy()の 引数がクォータニオンでない！");
  }
}

//----------------------------------------------------------------------------
//共役四元数
//自身が共役四元数に変化
Quaternion.prototype.conjugate = function()
{
  var q = new Quaternion(this.s, this.x, this.y, this.z);
  this.s =  q.s;
  this.x = -q.x;
  this.y = -q.y;
  this.z = -q.z;
}

//------------------------------------------------------------------------------
//共役四元数
function conjugate(q)
{
  if(typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    return new Quaternion(q.s, -q.x, -q.y, -q.z);
  }
  else
  {
    console.log("Quaternion ERROR --- conjugate()の 引数がクォータニオンでない！");
  }
}

//---------------------------------------------------
//クォータニオン加算
Quaternion.prototype.add = function(q)
{
  if(typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    this.s += q.s;
    this.x += q.x;
    this.y += q.y;
    this.z += q.z;
  }
  else
  {
    console.log("Quaternion ERROR --- add()の 引数がクォータニオンでない！");
  }
}
//------------------------------------------------------
//クォータニオン加算
function addQQ(p, q)
{
  if(typeof p.s === 'number' && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' && 
     typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    var c = new Quaternion();
    c.copy(p);
    c.add(q);
    return c;
  }
  else{
    console.log("Quaternion ERROR --- add()の 引数がクォータニオンでない！");
  }
}
//---------------------------------------------------
//クォータニオン減算
Quaternion.prototype.sub = function(q)
{
  if(typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    this.s -= q.s;
    this.x -= q.x;
    this.y -= q.y;
    this.z -= q.z;
  }
  else
  {
    console.log("Quaternion ERROR --- add()の 引数がクォータニオンでない！");
  }
}
//------------------------------------------------------
//クォータニオン減算
function subQQ(p, q)
{
  if(typeof p.s === 'number' && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' && 
     typeof q.s === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' )
  {
    var c = new Quaternion();
    c.copy(p);
    c.sub(q);
    return c;
  }
  else{
    console.log("Quaternion ERROR --- add()の 引数がクォータニオンでない！");
  }
}
//---------------------------------------------------------------------
//スカラ乗算
Quaternion.prototype.mulS = function(s)
{
  if(typeof a == 'number')//aがスカラ
  {
    this.s *= s;
    this.x *= s;
    this.y *= s;
    this.z *= s;
  }
  else
  {
    console.log("Quaternion ERROR --- mul()の 引数がスカラでない！");
  }
}

//---------------------------------------------------------------------
//クォータニオンとスカラの乗算
//クォータニオンを返す
function mulQS(p, s)
{
  if(typeof p === 'object' && typeof s === 'number')
  {
    var q = new Quaternion();
    q.s = p.s * s;
    q.x = p.x * s;
    q.y = p.y * s;
    q.z = p.z * s;
    return q;
  }
  else
  {
    console.log("Quaternion ERROR --- mul()の 引数が不正！");
  }
}

//---------------------------------------------------------------------
//スカラ除算
Quaternion.prototype.divS = function(s)
{
  if(typeof s == 'number')//aがスカラ
  {
    this.s /= s;
    this.x /= s;
    this.y /= s;
    this.z /= s;
  }
  else
  {
    console.log("Quaternion ERROR --- div()の 引数がスカラでない！");
  }
}
//---------------------------------------------------------------------
//クォータニオンをスカラで除算
//クォータニオンを返す

function divQS(p, s)
{
  if(typeof p === 'object' && typeof s === 'number')
  {
    var q = new Quaternion();
    q.s = p.s / s;
    q.x = p.x / s;
    q.y = p.y / s;
    q.z = p.z / s;
    return q;
  }
  else
  {
    console.log("Quaternion ERROR --- div()の 引数が不正！");
  }
}

//-------------------------------------------------------------------
//四元数どうしの乗算
//自身のクォータニオンに引数のクォータニオンを右から掛ける
Quaternion.prototype.mulQ = function(q)
{
  var p = new Quaternion(this.s, this.x, this.y, this.z);//自身の四元数
  var u = new Vector3(this.x, this.y, this.z);//そのベクトル部
  var v = new Vector3(q.x, q.y, q.z);//引数四元数のベクトル部
  this.s = p.s * q.s - dot(u, v);
  var w = new Vector3();
  w = add(mul(p.s , v), mul(q.s , u));
  w.add(cross(u, v)); 
  this.x = w.x; this.y = w.y, this.z = w.z;
}
//-------------------------------------------------------------------
//四元数どうしの乗算
//引数のクォータニオンと引数のクォータニオンを乗算
//クォータニオンを返す
function mulQQ(p, q)
{
  var pp = new Quaternion();
  pp.copy(p);
  pp.mulQ(q);
  return pp;
}

//----------------------------------------------------------------------
//クォータニオンとベクトルの乗算
//クォータニオンを返す
function mulQV(q, v)
{
//console.log("ZZZ s = " + q.s + " x = " + q.x + " y = " + q.y + " z = " + q.z);
//console.log("PPP  x = " + v.x + " y = " + v.y + " z = " + v.z);
  if(typeof q === 'object' && typeof v === 'object')
  {
    var p = new Quaternion(0, v.x, v.y, v.z);//スカラ部が0の四元数
    return mulQQ(q, p);
  }
  else
    console.log("Quaternion ERROR --- mulQV()の 引数が不正！");  
}
//----------------------------------------------------------------------
//クォータニオンとベクトルの乗算
//クォータニオンを返す
function mulVQ(v, q)
{
  if(typeof q === 'object' && typeof v === 'object')
  {
    var p = new Quaternion(0, v.x, v.y, v.z);//スカラ部が0の四元数
    return mulQQ(p, q);
  }
  else
    console.log("Quaternion ERROR --- mulVQ()の 引数が不正！");  
}
//-----------------------------------------------------------------------
//大きさを返す
function magQ(q)
{
  return Math.sqrt(q.s*q.s + q.x*q.x + q.y*q.y + q.z*q.z);
}
//-----------------------------------------------------------------------
//自身を正規化
Quaternion.prototype.norm = function()
{
  var eps = 0.000001;
  var p = new Quaternion();
  p.copy(this);
  var mag = magQ(p);
  if(mag <= eps) mag = 1;
  p.divS(mag);
  if(Math.abs(p.s) < eps) p.s = 0.0;
  if(Math.abs(p.x) < eps) p.x = 0.0;
  if(Math.abs(p.y) < eps) p.y = 0.0;
  if(Math.abs(p.z) < eps) p.z = 0.0;
  this.copy(p);
}
//-----------------------------------------------------------------------
//引数を正規化
//引数自身は変化しない
//クォータニオンを返す
function normQ(q)
{
  var eps = 0.000001;
  var p = new Quaternion();
  var mag = q_mag(q);
  if(mag <= eps) mag = 1;
  p = q_div(q, mag);
  if(Math.abs(p.s) < eps) p.s = 0.0;
  if(Math.abs(p.x) < eps) p.x = 0.0;
  if(Math.abs(p.y) < eps) p.y = 0.0;
  if(Math.abs(p.z) < eps) p.z = 0.0;
  
  return p;
}
//--------------------------------------------------------------------------
//ベクトル部分を返す
function getVector(q)
{
  var v = new Vector3(q.x, q.y, q.z);
  return v;
}
//---------------------------------------------------------------------------
//ベクトルvをクォータニオンqで回転し回転後のベクトルを返す
//オブジェクト座標系--->慣性座標系
function qvRotate(q, v)
{
  var c = conjugate(q);//qの共役
  var p = mulQV(q, v);
  var qq = mulQQ(p, c);
  return getVector(qq);
}
//---------------------------------------------------------------------------
//任意の回転軸axisと回転角angからからクォータニオンを作成
//axisは慣性座標、angは[deg]
function getQFromAxis(ang, axis)
{
  axis.norm();//axisを正規化
  var alpha = ang * DEG_TO_RAD / 2.0;
  axis.mul(Math.sin(alpha));
  var q = new Quaternion(Math.cos(alpha), axis.x, axis.y, axis.z);
  return q;
}
//----------------------------------------------------------------------
//オイラー角のxyzの順番で回転させるときと等価なクォータニオンを作成
//オイラー角elrは[deg]単位の3次元ベクトル
function getQFromEulerXYZ(elr)
{
  qx = getQFromAxis(elr.x, new Vector3(1, 0, 0));
  qy = getQFromAxis(elr.y, new Vector3(0, 1, 0));
  qz = getQFromAxis(elr.z, new Vector3(0, 0, 1));
  var p = mulQQ(qy, qx);
  var q = mulQQ(qz, p);
  
  return q;
} 
//----------------------------------------------------------------------
//オイラー角のzyxの順番で回転させるときと等価なクォータニオンを作成
//オイラー角elrは[deg]単位の3次元ベクトル
function getQFromEulerZYX(elr)
{
  qx = getQFromAxis(elr.x, new Vector3(1, 0, 0));
  qy = getQFromAxis(elr.y, new Vector3(0, 1, 0));
  qz = getQFromAxis(elr.z, new Vector3(0, 0, 1));
  p = mulQQ(qx, qy);
  q = mulQQ(p, qz);
  return q;
}

/**************************************************************
    乱数
***************************************************************/
//
function getRandom(fMin, fMax)
{//一様乱数
  return fMin + (fMax - fMin) * Math.random();
}

//放射状の一様乱数
function getRandomVector(r0)
{
  vPos = new Vector3(getRandom(-r0, r0), getRandom(-r0, r0), getRandom(-r0, r0));
  return vPos;
}

//XY平面における放射状の一様乱数
function getRandomVectorXY(r0)
{
  vPos = new Vector3();
  var r = getRandom(0.0, r0);
  var theta = getRandom(-Math.PI, Math.PI);
  vPos.x = Math.cos(theta) * r;
  vPos.y = Math.sin(theta) * r;
  return vPos;
}
//リング状に分布する乱数(中心ほど密度は高い)
function getRandomRingVectorXY(minR, maxR)
{
  vPos = new Vector3();
  var r = getRandom(minR, maxR);
  var theta = getRandom(-Math.PI, Math.PI);
  vPos.x = Math.cos(theta) * r;
  vPos.y = Math.sin(theta) * r;
  return vPos;
}
