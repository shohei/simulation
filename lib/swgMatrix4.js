/*------------------------------------------------------------------------------------------------------
  松田晃一著：「WebGL+HTML5　3DCGプログラミング入門」，カットシステム，2012年
  この書籍に添付されているCD-ROMのcuon-matrix.jsの1部を著者の許可を得て変更あるいは削除して使用している．
--------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------
 4x4の行列を実装したクラス． 
 この行列は、OpenGL,GLSLとおなじように列優先である．
 行列演算は右方向から実行する．
------------------------------------------------*/

//単位行列に初期化するコンストラクタ
function Matrix4()
{
  this.elements = new Float32Array([
     1,0,0,0, 
     0,1,0,0, 
     0,0,1,0, 
     0,0,0,1
  ]);
};

Matrix4.prototype.set = function(e0, e1, e2, e3, e4, e5, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15) 
{
  this.elements[0] = e0;
  this.elements[1] = e1;
  this.elements[2] = e2;
  this.elements[3] = e3;
  this.elements[4] = e4;
  this.elements[5] = e5;
  this.elements[6] = e6;
  this.elements[7] = e7;
  this.elements[8] = e8;
  this.elements[9] = e9;
  this.elements[10] = e10;
  this.elements[11] = e11;
  this.elements[12] = e12;
  this.elements[13] = e13;
  this.elements[14] = e14;
  this.elements[15] = e15;
}
/*---------------------------------------------------
 渡された行列の要素をコピーする。
 src 要素をコピーしてくる行列
 ----------------------------------------------------*/
Matrix4.prototype.copy = function(src) 
{
  var i, s, d;

  s = src.elements;
  d = this.elements;

  if (s === d) {
    return;
  }
    
  for (i = 0; i < 16; ++i) {
    d[i] = s[i];
  }

  return this;
};

/*-------------------------------
 行列どうしの積
 other:右側からかける行列
 this:掛けられる行列（その結果を返す）
---------------------------------*/
Matrix4.prototype.multiply = function(other) 
{
  var i, e, a, b, ai0, ai1, ai2, ai3;
  e = this.elements;
  a = this.elements;
  b = other.elements;

  for (i = 0; i < 4; i++) {
    ai0=a[i];  ai1=a[i+4];  ai2=a[i+8];  ai3=a[i+12];
    e[i]    = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
    e[i+4]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
    e[i+8]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
    e[i+12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
  }
};
/*-------------------------
 転置行列をつくる。
----------------------------*/
Matrix4.prototype.transpose = function() 
{
  var e, t;

  e = this.elements;

  t = e[ 1];  e[ 1] = e[ 4];  e[ 4] = t;
  t = e[ 2];  e[ 2] = e[ 8];  e[ 8] = t;
  t = e[ 3];  e[ 3] = e[12];  e[12] = t;
  t = e[ 6];  e[ 6] = e[ 9];  e[ 9] = t;
  t = e[ 7];  e[ 7] = e[13];  e[13] = t;
  t = e[11];  e[11] = e[14];  e[14] = t;

};

/*-----------------------------
 other: 逆行列を計算する行列
-------------------------------*/
Matrix4.prototype.setInverseOf = function(other) 
{
  var i, s, d, inv, det;

  s = other.elements;
  d = this.elements;
  inv = new Float32Array(16);

  inv[0]  =   s[5]*s[10]*s[15] - s[5] *s[11]*s[14] - s[9] *s[6]*s[15]
            + s[9]*s[7] *s[14] + s[13]*s[6] *s[11] - s[13]*s[7]*s[10];
  inv[4]  = - s[4]*s[10]*s[15] + s[4] *s[11]*s[14] + s[8] *s[6]*s[15]
            - s[8]*s[7] *s[14] - s[12]*s[6] *s[11] + s[12]*s[7]*s[10];
  inv[8]  =   s[4]*s[9] *s[15] - s[4] *s[11]*s[13] - s[8] *s[5]*s[15]
            + s[8]*s[7] *s[13] + s[12]*s[5] *s[11] - s[12]*s[7]*s[9];
  inv[12] = - s[4]*s[9] *s[14] + s[4] *s[10]*s[13] + s[8] *s[5]*s[14]
            - s[8]*s[6] *s[13] - s[12]*s[5] *s[10] + s[12]*s[6]*s[9];

  inv[1]  = - s[1]*s[10]*s[15] + s[1] *s[11]*s[14] + s[9] *s[2]*s[15]
            - s[9]*s[3] *s[14] - s[13]*s[2] *s[11] + s[13]*s[3]*s[10];
  inv[5]  =   s[0]*s[10]*s[15] - s[0] *s[11]*s[14] - s[8] *s[2]*s[15]
            + s[8]*s[3] *s[14] + s[12]*s[2] *s[11] - s[12]*s[3]*s[10];
  inv[9]  = - s[0]*s[9] *s[15] + s[0] *s[11]*s[13] + s[8] *s[1]*s[15]
            - s[8]*s[3] *s[13] - s[12]*s[1] *s[11] + s[12]*s[3]*s[9];
  inv[13] =   s[0]*s[9] *s[14] - s[0] *s[10]*s[13] - s[8] *s[1]*s[14]
            + s[8]*s[2] *s[13] + s[12]*s[1] *s[10] - s[12]*s[2]*s[9];

  inv[2]  =   s[1]*s[6]*s[15] - s[1] *s[7]*s[14] - s[5] *s[2]*s[15]
            + s[5]*s[3]*s[14] + s[13]*s[2]*s[7]  - s[13]*s[3]*s[6];
  inv[6]  = - s[0]*s[6]*s[15] + s[0] *s[7]*s[14] + s[4] *s[2]*s[15]
            - s[4]*s[3]*s[14] - s[12]*s[2]*s[7]  + s[12]*s[3]*s[6];
  inv[10] =   s[0]*s[5]*s[15] - s[0] *s[7]*s[13] - s[4] *s[1]*s[15]
            + s[4]*s[3]*s[13] + s[12]*s[1]*s[7]  - s[12]*s[3]*s[5];
  inv[14] = - s[0]*s[5]*s[14] + s[0] *s[6]*s[13] + s[4] *s[1]*s[14]
            - s[4]*s[2]*s[13] - s[12]*s[1]*s[6]  + s[12]*s[2]*s[5];

  inv[3]  = - s[1]*s[6]*s[11] + s[1]*s[7]*s[10] + s[5]*s[2]*s[11]
            - s[5]*s[3]*s[10] - s[9]*s[2]*s[7]  + s[9]*s[3]*s[6];
  inv[7]  =   s[0]*s[6]*s[11] - s[0]*s[7]*s[10] - s[4]*s[2]*s[11]
            + s[4]*s[3]*s[10] + s[8]*s[2]*s[7]  - s[8]*s[3]*s[6];
  inv[11] = - s[0]*s[5]*s[11] + s[0]*s[7]*s[9]  + s[4]*s[1]*s[11]
            - s[4]*s[3]*s[9]  - s[8]*s[1]*s[7]  + s[8]*s[3]*s[5];
  inv[15] =   s[0]*s[5]*s[10] - s[0]*s[6]*s[9]  - s[4]*s[1]*s[10]
            + s[4]*s[2]*s[9]  + s[8]*s[1]*s[6]  - s[8]*s[2]*s[5];

  det = s[0]*inv[0] + s[1]*inv[4] + s[2]*inv[8] + s[3]*inv[12];
  if (det === 0) {
  　console.log("Matrix4の逆行列を求めることができません");
  }

  det = 1 / det;
  for (i = 0; i < 16; i++) {
    d[i] = inv[i] * det;
  }
};

/*-----------------------------
 自身の逆行列を求める
-------------------------------*/
Matrix4.prototype.invert = function() {
  return this.setInverseOf(this);
};

/*----------------------------------
 正射影行列に設定しthisにかけられる
 left: 左クリップ平面のX座標
 right: 右クリップ平面のX座標
 bottom: 下クリップ平面のY座標
 top: 上クリップ平面のY座標
 near: 近クリップ平面までの距離
 far: 遠クリップ平面までの距離
-------------------------------------*/
Matrix4.prototype.ortho = function(left, right, bottom, top, near, far) 
{
  var e, rw, rh, rd;

  if (left === right || bottom === top || near === far) {
    console.log( 'ortho error!');
  }

  rw = 1 / (right - left);
  rh = 1 / (top - bottom);
  rd = 1 / (far - near);

  var e = new Float32Array(16);

  e[0]  = 2 * rw;
  e[1]  = 0;
  e[2]  = 0;
  e[3]  = 0;

  e[4]  = 0;
  e[5]  = 2 * rh;
  e[6]  = 0;
  e[7]  = 0;

  e[8]  = 0;
  e[9]  = 0;
  e[10] = -2 * rd;
  e[11] = 0;

  e[12] = -(right + left) * rw;
  e[13] = -(top + bottom) * rh;
  e[14] = -(far + near) * rd;
  e[15] = 1;

  var m = new Matrix4();
  m.elements = e; 
  
  this.multiply(m);

};

/*---------------------------------------------------
 透視射影行列を作成し右からthisに掛ける
 fov: 垂直視野角 [度]
 aspect: 視野のアスペクト比（幅 / 高さ）
 near: 近クリップ平面までの距離。正数でなくてはならない
 far: 遠クリップ平面までの距離。正数でなくてはならない
-------------------------------------------------------*/
Matrix4.prototype.perspective = function(fov, aspect, near, far) 
{
  var e, rd, s, ct;

  if (near === far || aspect === 0) {
    console.log('perspective error! near = far or aspect = 0');
  }
  if (near <= 0) {
    console.log( 'perspective error! near <= 0');
  }
  if (far <= 0) {
    console.log( 'perspective error! far <= 0');
  }

  fov = Math.PI * fov / 180 / 2;
  s = Math.sin(fov);
  if (s === 0) {
    console.log( 'perspective error! fovY = 0');
  }

  rd = 1 / (far - near);
  ct = Math.cos(fov) / s;

  var e = new Float32Array(16);

  e[0]  = ct / aspect;
  e[1]  = 0;
  e[2]  = 0;
  e[3]  = 0;

  e[4]  = 0;
  e[5]  = ct;
  e[6]  = 0;
  e[7]  = 0;

  e[8]  = 0;
  e[9]  = 0;
  e[10] = -(far + near) * rd;
  e[11] = -1;

  e[12] = 0;
  e[13] = 0;
  e[14] = -2 * near * far * rd;
  e[15] = 0;

  var m = new Matrix4();
  m.elements = e; 
  this.multiply(m);
};
/*----------------------------------------
 スケーリング行列をつくりthisに右からかける
 x: X方向の倍率
 y: Y方向の倍率
 z: Z方向の倍率
-------------------------------------------*/
Matrix4.prototype.scale = function(x, y, z) 
{
  var e = new Float32Array(16);

  e[0] = x;  e[4] = 0;  e[8]  = 0;  e[12] = 0;
  e[1] = 0;  e[5] = y;  e[9]  = 0;  e[13] = 0;
  e[2] = 0;  e[6] = 0;  e[10] = z;  e[14] = 0;
  e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  var m = new Matrix4();
  m.elements = e; 
  this.multiply(m);
};

/*-----------------------------------
 平行移動行列をつくり右からかける
 x: X方向の移動量
 y: Y方向の移動量
 z: Z方向の移動量
-------------------------------------*/
Matrix4.prototype.translate = function(x, y, z) 
{
  var e = new Float32Array(16);

  e[0] = 1;  e[4] = 0;  e[8]  = 0;  e[12] = x;
  e[1] = 0;  e[5] = 1;  e[9]  = 0;  e[13] = y;
  e[2] = 0;  e[6] = 0;  e[10] = 1;  e[14] = z;
  e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  var m = new Matrix4();
  m.elements = e; 
  this.multiply(m);  
};

/*------------------------------
 * 回転行列をつくり右からかける
 angle: 回転角 [度]
 x: 回転軸方向ベクトルのX成分
 y: 回転軸方向ベクトルのY成分
 z: 回転軸方向ベクトルのZ成分
--------------------------------*/
Matrix4.prototype.rotate = function(angle, x, y, z) 
{
  var e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs;

  angle = Math.PI * angle / 180;
  
  var e = new Float32Array(16);

  s = Math.sin(angle);
  c = Math.cos(angle);

  if (0 !== x && 0 === y && 0 === z) {
    // X軸まわりの回転
    if (x < 0) {
      s = -s;
    }
    e[0] = 1;  e[4] = 0;  e[ 8] = 0;  e[12] = 0;
    e[1] = 0;  e[5] = c;  e[ 9] =-s;  e[13] = 0;
    e[2] = 0;  e[6] = s;  e[10] = c;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else if (0 === x && 0 !== y && 0 === z) {
    // Y軸まわりの回転
    if (y < 0) {
      s = -s;
    }
    e[0] = c;  e[4] = 0;  e[ 8] = s;  e[12] = 0;
    e[1] = 0;  e[5] = 1;  e[ 9] = 0;  e[13] = 0;
    e[2] =-s;  e[6] = 0;  e[10] = c;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else if (0 === x && 0 === y && 0 !== z) {
    // Z軸まわりの回転
    if (z < 0) {
      s = -s;
    }
    e[0] = c;  e[4] =-s;  e[ 8] = 0;  e[12] = 0;
    e[1] = s;  e[5] = c;  e[ 9] = 0;  e[13] = 0;
    e[2] = 0;  e[6] = 0;  e[10] = 1;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else {
    // その他の任意軸まわりの回転
    len = Math.sqrt(x*x + y*y + z*z);
    if (len !== 1) {
      rlen = 1 / len;
      x *= rlen;
      y *= rlen;
      z *= rlen;
    }
    nc = 1 - c;
    xy = x * y;
    yz = y * z;
    zx = z * x;
    xs = x * s;
    ys = y * s;
    zs = z * s;

    e[ 0] = x*x*nc +  c;
    e[ 1] = xy *nc + zs;
    e[ 2] = zx *nc - ys;
    e[ 3] = 0;

    e[ 4] = xy *nc - zs;
    e[ 5] = y*y*nc +  c;
    e[ 6] = yz *nc + xs;
    e[ 7] = 0;

    e[ 8] = zx *nc + ys;
    e[ 9] = yz *nc - xs;
    e[10] = z*z*nc +  c;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;
  }
  
  var m = new Matrix4();
  m.elements = e;
  this.multiply(m);
};

/*------------------------------------------------
 視野変換行列を設定する。
 eyeX, eyeY, eyeZ: 視点の位置
 centerX, centerY, centerZ: 注視点の位置
 upX, upY, upZ: カメラの上方向を表す方向ベクトル
--------------------------------------------------*/
Matrix4.prototype.lookAt = function(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) 
{
  var fx, fy, fz, rlf, sx, sy, sz, rls, ux, uy, uz;

  fx = centerX - eyeX;
  fy = centerY - eyeY;
  fz = centerZ - eyeZ;

  // fを正規化する
  rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
  fx *= rlf;
  fy *= rlf;
  fz *= rlf;

  // fとupの外積を求める
  sx = fy * upZ - fz * upY;
  sy = fz * upX - fx * upZ;
  sz = fx * upY - fy * upX;

  // sを正規化する
  rls = 1 / Math.sqrt(sx*sx + sy*sy + sz*sz);
  sx *= rls;
  sy *= rls;
  sz *= rls;

  // sとfの外積を求める
  ux = sy * fz - sz * fy;
  uy = sz * fx - sx * fz;
  uz = sx * fy - sy * fx;

  var e = new Float32Array(16);
  
  e[0] = sx;
  e[1] = ux;
  e[2] = -fx;
  e[3] = 0;

  e[4] = sy;
  e[5] = uy;
  e[6] = -fy;
  e[7] = 0;

  e[8] = sz;
  e[9] = uz;
  e[10] = -fz;
  e[11] = 0;

  e[12] = 0;
  e[13] = 0;
  e[14] = 0;
  e[15] = 1;

  var m = new Matrix4();
  m.elements = e; 
  // 平行移動する
  m.translate(-eyeX, -eyeY, -eyeZ);
  
  this.multiply(m);
};

/*-----------------------------------------------------------------------
 頂点を平面上に射影するような行列を右からかける。
 plane: 平面方程式 ax + by + cz + d = 0 の係数[a, b, c, d]を格納した配列
 light: 光源の同次座標を格納した配列。light[3]=0の場合、平行光源を表す
 ------------------------------------------------------------------------*/
Matrix4.prototype.dropShadow = function(plane, light) 
{
  var e = new Float32Array(16);

  var dot = plane[0] * light[0] + plane[1] * light[1] + plane[2] * light[2] + plane[3] * light[3];

  e[ 0] = dot - light[0] * plane[0];
  e[ 1] =     - light[1] * plane[0];
  e[ 2] =     - light[2] * plane[0];
  e[ 3] =     - light[3] * plane[0];

  e[ 4] =     - light[0] * plane[1];
  e[ 5] = dot - light[1] * plane[1];
  e[ 6] =     - light[2] * plane[1];
  e[ 7] =     - light[3] * plane[1];

  e[ 8] =     - light[0] * plane[2];
  e[ 9] =     - light[1] * plane[2];
  e[10] = dot - light[2] * plane[2];
  e[11] =     - light[3] * plane[2];

  e[12] =     - light[0] * plane[3];
  e[13] =     - light[1] * plane[3];
  e[14] =     - light[2] * plane[3];
  e[15] = dot - light[3] * plane[3];

  var m = new Matrix4();
  m.elements = e; 
  
  this.multiply(m);
}
