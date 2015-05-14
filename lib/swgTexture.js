//--------------------------------------------------
//kwgTexture.js
//--------------------------------------------------

function makeCubeTex(vertices, texCoords, normals, indices, flagDebug, nRepeatS, nRepeatT)
{
  // 6面にテクスチャをマッピング
  // 1辺が1の立方体を生成する
  //    p2----- p1
  //   /|      /|
  //  p3------p0|
  //  | |     | |
  //  | |p6---|-|p5
  //  |/      |/
  //  p7------p4
  
  // 頂点座標
  var vv = [
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, //p0-p1-p2-p3 上(0,1,2,3)
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, //p0-p3-p7-p4 前(4,5,6,7)
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, //p0-p4-p5-p1 右(8,9,10,11)
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, //p1-p5-p6-p2 奥(12,13,14,15)
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, //p6-p7-p3-p2 左(16,17,18,19)
     0.5, 0.5,-0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5  //p4-p7-p6-p5 下(20,21,22,23)
  ];
  for(var i = 0; i < vv.length; i++) vertices[i] = vv[i];
  //テクスチャ座標
  var s = nRepeatS;
  var t = nRepeatT;
  var tt = [ s, 0,  s, t,  0, t,  0, 0,
             s, t,  0, t,  0, 0,  s, 0,
             0, t,  0, 0,  s, 0,  s, t,
             0, t,  0, 0,  s, 0,  s, t,
             0, 0,  s, 0,  s, t,  0, t,
             s, t,  0, t,  0, 0,  s, 0
  ];
  for(var i = 0; i < tt.length; i++) texCoords[i] = tt[i];
  
  // 法線
  var nn = [
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  //p0-p1-p2-p3 上
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  //p0-p3-p7-p4 前
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  //p0-p4-p5-p1 右
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  //p1-p5-p6-p2 奥
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  //p6-p7-p3-p2 左
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   //p4-p7-p6-p5 下
  ];
  for(var i = 0; i < nn.length; i++) normals[i] = nn[i];
  // インデックス
  if(flagDebug == false)
  {//各三角形頂点に対するインデックス
    var ii = [
       0, 1, 2,   0, 2, 3,    // 上
       4, 5, 6,   4, 6, 7,    // 前
       8, 9,10,   8,10,11,    // 右
      12,13,14,  12,14,15,    // 奥
      16,17,18,  16,18,19,    // 左
      20,21,22,  20,22,23     // 下
    ];
    for(var i = 0; i < ii.length; i++) indices[i] = ii[i];
  }
  else
  {
    var i2 = [
      0, 1, 2, 3,
      4, 5, 6, 7,
      8, 9, 10, 11,
      12, 13, 14, 15,
      16, 17, 18, 19,
      22, 23, 20, 21
    ];
    for(var i = 0; i < i2.length; i++) indices[i] = i2[i];
  }
  return indices.length;
}
//---------------------------------------------------------------------------------------------
function makeCubeBump(vertices, texCoords, normals, indices, flagDebug, nRepeatS, nRepeatT)
{ //バンプマッピング用
  // 側面4面にテクスチャをマッピング
  // 1辺が1の立方体を生成する
  //    p2----- p1
  //   /|      /|
  //  p3------p0|
  //  | |     | |
  //  | |p6---|-|p5
  //  |/      |/
  //  p7------p4
  
  // 頂点座標
  var vv = [
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, //p0-p1-p2-p3 上(0,1,2,3)
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, //p0-p3-p7-p4 前(4,5,6,7)
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, //p0-p4-p5-p1 右(8,9,10,11)
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, //p1-p5-p6-p2 奥(12,13,14,15)
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, //p6-p7-p3-p2 左(16,17,18,19)
     0.5, 0.5,-0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5  //p4-p7-p6-p5 下(20,21,22,23)
  ];
  for(var i = 0; i < vv.length; i++) vertices[i] = vv[i];
  //テクスチャ座標
  var s = nRepeatS;
  var t = nRepeatT;
  var tt = [ 
             0, 0,  0, 0,  0, 0,  0, 0,//上
             s, t,  0, t,  0, 0,  s, 0,
             0, t,  0, 0,  s, 0,  s, t,
             0, t,  0, 0,  s, 0,  s, t,
             0, 0,  s, 0,  s, t,  0, t,
             0, 0,  0, 0,  0, 0,  0, 0//下
  ];
  for(var i = 0; i < tt.length; i++) texCoords[i] = tt[i];
  
  // 法線
  var nn = [
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  //p0-p1-p2-p3 上
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  //p0-p3-p7-p4 前
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  //p0-p4-p5-p1 右
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  //p1-p5-p6-p2 奥
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  //p6-p7-p3-p2 左
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   //p4-p7-p6-p5 下
  ];
  for(var i = 0; i < nn.length; i++) normals[i] = nn[i];
  // インデックス
  if(flagDebug == false)
  {//各三角形頂点に対するインデックス
    var ii = [
       0, 1, 2,   0, 2, 3,    // 上
       4, 5, 6,   4, 6, 7,    // 前
       8, 9,10,   8,10,11,    // 右
      12,13,14,  12,14,15,    // 奥
      16,17,18,  16,18,19,    // 左
      20,21,22,  20,22,23     // 下
    ];
    for(var i = 0; i < ii.length; i++) indices[i] = ii[i];
  }
  else
  {
    var i2 = [
      0, 1, 2, 3,
      4, 5, 6, 7,
      8, 9, 10, 11,
      12, 13, 14, 15,
      16, 17, 18, 19,
      22, 23, 20, 21
    ];
    for(var i = 0; i < i2.length; i++) indices[i] = i2[i];
  }
  return indices.length;
}

//-----------------------------------------------
function makeSphereTex(vertices, texCoords, normals, indices, nSlice, nStack, nRepeatS, nRepeatT)
{
  //直径が1の球(鉛直軸はｚ)に球投影
  //nSlice:経度方向(i)分割数
  //nStack:緯度方向(j)分割数
  var i, phi, si, ci;
  var j, theta, sj, cj;
  var r = 0.5;
  var s, t;//テクスチャ座標
  
  // 頂点座標を生成する
  for (j = 0; j <= nStack; j++) 
  {
    theta = j * Math.PI / nStack;
    sj = r * Math.sin(theta);
    cj = r * Math.cos(theta);
    //北極点を1とするt座標
    t = (1.0 - j / nStack) * nRepeatT;

    for (i = 0; i <= nSlice; i++) 
    {
      phi = i * 2 * Math.PI / nSlice;
      si = Math.sin(phi);
      ci = Math.cos(phi);
      
      vertices.push(sj * ci);//x
      vertices.push(sj * si);//y
      vertices.push(cj);     //z
      //テクスチャのs座標
      s = i * nRepeatS / nSlice;
      texCoords.push(s);
      texCoords.push(t);
    }
  }

  var k1, k2;
  // インデックスを生成する
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
      k1 = j * (nSlice+1) + i;
      k2 = k1 + (nSlice+1);

      indices.push(k1);
      indices.push(k2);
      indices.push(k1 + 1);

      indices.push(k1 + 1);
      indices.push(k2);
      indices.push(k2 + 1);
    }
  }

  // 頂点座標と法線は同じものが使える
  for(var i = 0; i < vertices.length; i++) normals[i] = vertices[i];
  
  return indices.length;

}

//----------------------------------------------------------------------
function makeCylinderTex(vertices, texCoords, normals, indices, radiusRatio, nSlice, flagDebug, nRepeatS, nRepeatT)
{
  //側面に円筒投影
  //半径0.5，高さ1.0の円柱
  //円柱(rBottom=rTop))、円錐台、円錐(rTop = 0.0)
  //nSlice--xy断面分割数
  
  var rBottom = 0.5;//下底半径
  var rTop = rBottom * radiusRatio;//上底半径
  var height = 1.0;//高さ
  //物体の中心は下底と上底の中間
  var i, j;
  var phi;
  var phi0 = 2.0*Math.PI/nSlice;
  var s, t;
 
  //上底(Top)
  vertices[0] = 0.0; vertices[1] = 0.0; vertices[2] = height/2.0; //中心点
  normals[0]  = 0.0; normals[1]  = 0.0; normals[2]  = 1.0;
  //側面にだけテクスチャをマッピングしますが，上下の頂点にもテクスチャ座標を与えないときは
  //gl.drawElementsでGL_INVALID_OPERATIONのエラーになる
  texCoords.push(0);
  texCoords.push(0);

  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(rTop * Math.cos(phi));//x
    vertices.push(rTop * Math.sin(phi));//y
    vertices.push(height/2.0);          //z
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(1.0); //z
       
    //空のデータをテクスチャ座標に与える
    texCoords.push(0);
    texCoords.push(0);
    
  }
  //側面(Side)
  var rr = rBottom - rTop;//半径差
  var ss = Math.sqrt(rr*rr + height*height);//斜辺
  var nz = rr / ss;
  var nxy = height / ss;
  var hh, r0;
  
  for(j = 0; j <= 1; j++)
  {
    if(j == 0) { hh = height / 2.0; r0 = rTop; }
    else { hh = - height / 2.0; r0 = rBottom; }
    t = (1 - j) * nRepeatT;//テクスチャ t 座標
    
    for(i = 0; i <= nSlice; i++)
    {
       phi = i * phi0;
       vertices.push(r0 * Math.cos(phi));//x座標
       vertices.push(r0 * Math.sin(phi));//y座標
       vertices.push(hh); //z座標
       
       s = i * nRepeatS / nSlice;
       texCoords.push(s);
       texCoords.push(t);
       
       //法線ベクトル
       normals.push(nxy * Math.cos(phi));//x
       normals.push(nxy * Math.sin(phi));//y
       normals.push(nz);                 //z
    }  
  }
 
  var nd = vertices.length;//これまでの頂点データ個数
  //下底（Bottom)
  vertices[nd] = 0.0; vertices[nd+1] = 0.0; vertices[nd+2] = -height/2.0; //中心点
  normals[nd]  = 0.0; normals[nd+1]  = 0.0; normals[nd+2]  = -1.0;
    
  //空のデータをテクスチャ座標に与える
  texCoords.push(0);
  texCoords.push(0);

  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0;//時計回り
    vertices.push(rBottom * Math.cos(phi));//x
    vertices.push(rBottom * Math.sin(phi));//y
    vertices.push(-height/2.0);            //z
    normals.push( 0.0); //x
    normals.push( 0.0); //y
    normals.push(-1.0); //z

    //空のデータをテクスチャ座標に与える
    texCoords.push(0);
    texCoords.push(0);
  }

  //index
  if(flagDebug == false)
  {
    //Top
    for(var i = 0; i < nSlice; i++)
    {
      indices.push(0); indices.push(i+1); indices.push(i+2); 
    }
    for(i = 0; i < nSlice; i++)
    {//各面に三角形要素が2つ
      indices.push(nSlice + 2 + i);
      indices.push(2*nSlice + 3 + i);
      indices.push(nSlice + 3 + i);
      
      indices.push(2*nSlice + 3 + i);
      indices.push(2*nSlice + 4 + i);
      indices.push(nSlice + 3 + i);
    }
    //Bottom 
    var nv = nd / 3; //中心点の頂点番号 
    for(i = 0; i < nSlice; i++)
    {
      indices.push(nv); indices.push(nv+i+1); indices.push(nv+i+2);
    }
  }
  else //wireframe
  {//側面だけでよい
    for(i = 0; i < nSlice; i++)
    {
      indices.push(nSlice + 2 + i);
      indices.push(2*nSlice + 3 + i);
      indices.push(2*nSlice + 4 + i);
      indices.push(nSlice + 3 + i);
      indices.push(nSlice + 2 + i);
    }
  }
  return indices.length;
}

//----------------------------------------------------------------------
function makePrismTex(vertices, texCoords, normals, indices, radiusRatio, nSlice, flagDebug, nRepeatS, nRepeatT)
{
  //円筒投影でテクスチャマッピング
  //半径0.5，高さ1.0の円柱に内接する多角柱
  //多角柱(rBottom=rTop))、多角錐台、多角錐(rTop = 0.0)
  //nSlice--xy断面分割数

  var rBottom = 0.5;//下底半径
  var rTop = rBottom * radiusRatio;//上底半径
  var height = 1.0;//高さ

  var i, j;
  var phi, phi2;
  var phi0 = 2.0 * Math.PI/nSlice;
  var s, t;
  
  //上底（Top)
  vertices[0] = 0.0; vertices[1] = 0.0; vertices[2] = height/2.0; //中心点
  normals[0]  = 0.0; normals[1]  = 0.0; normals[2]  = 1.0;
  //側面にだけテクスチャをマッピングしますが，
  //上下の頂点にもテクスチャ座標を与えないと
  //gl.drawElementsでGL_INVALID_OPERATIONのエラーになる
  texCoords.push(0);
  texCoords.push(0);

  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0 + phi0/2;//平らな面が正面を向くようにphi0/2を追加
    vertices.push(rTop * Math.cos(phi));//x
    vertices.push(rTop * Math.sin(phi));//y
    vertices.push(height/2.0);          //z
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(1.0); //z
    //空のデータをテクスチャ座標に与える
    texCoords.push(0);
    texCoords.push(0);
  }
  //側面(Side)
  var alpha = (nSlice - 2)*Math.PI / (2.0 * nSlice);
  var rr = (rBottom - rTop) * Math.sin(alpha);//半径差
  var ss = Math.sqrt(rr*rr + height*height);//斜辺
  var nz = rr / ss;
  var nxy = height / ss;
  var hh, r0;
  
  for(j = 0; j <= 1; j++)
  {
    //半径
    if(j == 0){ r0 = rTop; hh =  height/2.0; }
    else    {r0 = rBottom; hh = -height/2.0; }
    t = (1 - j) * nRepeatT;
    
    for(i = 0; i < nSlice; i++)
    {
      //1つの頂点に番号を2個必要
      phi = i * phi0 + phi0/2;
      phi2 = phi + phi0/2.0;
      //座標 
      vertices.push(r0 * Math.cos(phi));//x座標(外部から見て左側）
      vertices.push(r0 * Math.sin(phi));//y座標
      vertices.push(hh);                //z座標
      
      s = (i+0.5) * nRepeatS / nSlice;
      texCoords.push(s);
      texCoords.push(t);
       
      vertices.push(r0 * Math.cos(phi+phi0));//x座標（右側）
      vertices.push(r0 * Math.sin(phi+phi0));//y座標
      vertices.push(hh);                     //z座標
 
       s = (i+1.5) * nRepeatS / nSlice;
       texCoords.push(s);
       texCoords.push(t);
      
      //法線ベクトル(隣り合う頂点は同じ法線ベクトル）
      normals.push(nxy * Math.cos(phi2));//x
      normals.push(nxy * Math.sin(phi2));//y
      normals.push(nz);                  //z
      normals.push(nxy * Math.cos(phi2));//x
      normals.push(nxy * Math.sin(phi2));//y
      normals.push(nz);                  //z  
    }
  }
  
  var nd = vertices.length;//これまでの頂点データ個数

  //下底（Bottom)
  vertices[nd] = 0.0; vertices[nd+1] = 0.0; vertices[nd+2] = -height/2.0; //中心点
  normals[nd]  = 0.0; normals[nd+1]  = 0.0; normals[nd+2]  = -1.0;
  texCoords.push(0);
  texCoords.push(0);
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0 - phi0/2;//時計回り
    vertices.push(rBottom * Math.cos(phi));//x
    vertices.push(rBottom * Math.sin(phi));//y
    vertices.push(-height/2.0);            //z
    normals.push( 0.0); //x
    normals.push( 0.0); //y
    normals.push(-1.0); //z
    //空のデータをテクスチャ座標に与える
    texCoords.push(0);
    texCoords.push(0);
  }
  //index
  if(flagDebug == false)
  {
    //Top
    for(var i = 0; i < nSlice; i++)
    {
      indices.push(0); indices.push(i+1); indices.push(i+2);
    }
    //Side
    for(i = 0; i < nSlice; i++)
    {//各面に三角形要素が2つ
      indices.push(nSlice + 2 + i*2);
      indices.push(3 * nSlice + 2 + i*2);
      indices.push(nSlice + 3 + i*2);
      
      indices.push(3 * nSlice + 2 + i*2);
      indices.push(3 * nSlice + 3 + i*2);
      indices.push(nSlice + 3 + i*2);
    }
    //Bottom 
    var nv = nd / 3; //中心点の頂点番号 
    for(i = 0; i < nSlice; i++)
    {
      indices.push(nv); indices.push(nv+i+1); indices.push(nv+i+2);
    }
  }
  else//wireframe
  {
    //Top
    for(i = 0; i < nSlice; i++)
    {
      indices.push(nSlice + 2 + i*2);
      indices.push(3 * nSlice + 2 + i*2);
      indices.push(3 * nSlice + 3 + i*2);
      indices.push(nSlice + 3 + i*2);
      indices.push(nSlice + 2 + i*2);
    }  
  }
  return indices.length;
}

//---------------------------------------------
function makeTorusTex(vertices, texCoords, normals, indices, radiusRatio, nSlice, nStack, nRepeatS, nRepeatT)
{	
  var radius1 = 0.5;//円環の中心軸半径(主半径）
  var radius2 = radiusRatio * radius1;//断面半径（副半径）
  //nSlice:円環断面における表面分割点数
  //nStack:円環の分割数
  if(radiusRatio > 1.0) { printf("radiusRatio < 1 としてください"); return;}

  var i, j;
  var rr, zz;
  var theta0, theta1, phi;
  var s, t;

  //頂点座標，法線ベクトル
  for(j = 0; j <= nStack; j++)
  {
    //i=0は基本断面(x=radius1を中心とする円, y=0）
    theta0 = 2.0 * Math.PI * j / nStack;
    s = j * nRepeatS / nStack;//s座標
　　for(i = 0; i <= nSlice; i++)
    {
      phi = -Math.PI + 2.0 * Math.PI * i / nSlice;
      rr = radius1 + radius2 * Math.cos(phi);//z軸からの距離
      zz = radius2 * Math.sin(phi);
      //頂点のxyz座標(i=0を内側xy平面)
      vertices.push(rr * Math.cos(theta0));//x座標
      vertices.push(rr * Math.sin(theta0));//y
      vertices.push(zz);                   //z
      
      t = i * nRepeatT / nSlice;
      texCoords.push(s);
      texCoords.push(t);
      
      normals.push(Math.cos(phi)*Math.cos(theta0));//x
      normals.push(Math.cos(phi)*Math.sin(theta0));//y
      normals.push(Math.sin(phi));                 //z
    }
  }
  //インデックス
  for(j = 0; j < nStack; j++)
  {
　　for(i = 0; i < nSlice; i++)
    {
      indices.push((nSlice+1) * j + i);
      indices.push((nSlice+1) * (j+1) + i);
      indices.push((nSlice+1) * j + i+1);

      indices.push((nSlice+1) * (j+1) + i);
      indices.push((nSlice+1) * (j+1) + i+1);
      indices.push((nSlice+1) * j + i+1);
    }
  }
  return indices.length;
}
//-----------------------------------------------------------------
function makeSuperTex(vertices, texCoords, normals, indices, nSlice, nStack, eps1, eps2, nRepeatS, nRepeatT)
{
　//上下の中心が原点
　var i,j,ip,im,np,npL,npR,npU,npD,k;
　var ct,theta,phi,z,cc, ss, gg;
　var r = 0.5;//基本球の半径
  var s, t;//テクスチャ座標

  //頂点座標
  //j == 0;//Top（nSlice+1個）
  for (i = 0 ;i <= nSlice; i++)
  {
    vertices.push(0.0);//x
    vertices.push(0.0);//y
    vertices.push(r);  //z
    
    s = i * nRepeatS / nSlice; t = nRepeatT;
    texCoords.push(s);
    texCoords.push(t);
  }
 
　for(j = 1 ;j < nStack;j++)
  {
    //北極点を1とするt座標
    t = (1.0 - j / nStack) * nRepeatT;

    theta = (Math.PI/nStack) * (nStack / 2.0 - j);
		                //thetaはx-y平面からの偏角となっている
    if(theta >= 0.0) //上半分
    {
      z = r * Math.pow(Math.sin(Math.abs(theta)),eps1);
    }
    else//下半分        
	{
	  z = - r * Math.pow(Math.sin(Math.abs(theta)), eps1);
	}
    for (i = 0;i <= nSlice; i++)
    {
      phi = 2.0 * Math.PI * i/nSlice;
      ct = Math.cos(phi);
      if (ct >= 0) { cc = Math.pow(ct, eps2);}
	  else         { cc = -Math.pow(Math.abs(ct),eps2); }
      //座標
      vertices.push(r * Math.pow(Math.cos(theta),eps1)*cc);//x
	  if(i == 0 || i == nSlice/2 || i == nSlice) vertices.push(0.0);//y
      else 
      {
        ss = Math.sin(phi);
        gg = Math.pow(Math.abs(ss), eps2);
        if(i > nSlice/2) gg = -gg;
        vertices.push(r * Math.pow(Math.cos(theta),eps1) * gg);//y
      }
      vertices.push(z);//z	
      
      s = i * nRepeatS / nSlice;
      texCoords.push(s);
      texCoords.push(t);     
    }//i
  }//j
  //j = nStack:Bottom（nSlice+1個）
  for(i = 0; i <= nSlice; i++)
  {
    vertices.push(0.0);//x
    vertices.push(0.0);//y
    vertices.push(-r); //z
      
    s = i * nRepeatS / nSlice; t = 0;
    texCoords.push(s);
    texCoords.push(t);     
  }

  var p1 = [], p2 = [], p3 = [];
  var n1 = [], n2 = [], n3 = [], n4 = [];
  //法線ベクトル
  //Top
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0);//x
    normals.push(0.0);//y
    normals.push(1.0);//z
  }
  //Side
  for(j = 1;j < nStack;j++)//隣り合う4個の三角形の法線ベクトルを平均化
  {
    for(i = 0;i <= nSlice;i++)
    {
      ip = i+1;
	  if(ip == nSlice+1) ip = 1;
	  im = i-1;
	  if(i == 0) im = nSlice-1;

      np  = j*(nSlice+1)+i;//注目点
	  npL = j*(nSlice+1)+im;//左側
	  npR = j*(nSlice+1)+ip;//右側
	  npU = np-nSlice-1;//上
	  npD = np+nSlice+1;//下
      
      p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];
	  p2[0]=vertices[3*npU]; p2[1]=vertices[3*npU+1]; p2[2]=vertices[3*npU+2];
	  p3[0]=vertices[3*npL]; p3[1]=vertices[3*npL+1]; p3[2]=vertices[3*npL+2];
	  calcNormal(p1,p2,p3,n1);//外から見て左上
	  p2[0]=vertices[3*npR]; p2[1]=vertices[3*npR+1]; p2[2]=vertices[3*npR+2];
	  p3[0]=vertices[3*npU]; p3[1]=vertices[3*npU+1]; p3[2]=vertices[3*npU+2];
	  calcNormal(p1,p2,p3,n2);//右上
		//p1[0]=vertices[3*np]; p1[1]=vertices[3*np+1]; p1[2]=vertices[3*np+2];
      p2[0]=vertices[3*npL]; p2[1]=vertices[3*npL+1]; p2[2]=vertices[3*npL+2];
	  p3[0]=vertices[3*npD]; p3[1]=vertices[3*npD+1]; p3[2]=vertices[3*npD+2];
	  calcNormal(p1,p2,p3,n3);//外から見て左下
	  p2[0]=vertices[3*npD]; p2[1]=vertices[3*npD+1]; p2[2]=vertices[3*npD+2];
	  p3[0]=vertices[3*npR]; p3[1]=vertices[3*npR+1]; p3[2]=vertices[3*npR+2];
	  calcNormal(p1,p2,p3,n4);//右下
	  
      normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);//ｘ方向
	  normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);//ｙ
      normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//ｚ
    }
  }
  //Bottom
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(-1.0);//z
  }

  //インデックス
  var k1, k2;
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
      k1 = j * (nSlice+1) + i;
      k2 = k1 + (nSlice+1);

      indices.push(k1);
      indices.push(k2);
      indices.push(k1 + 1);

      indices.push(k2);
      indices.push(k2 + 1);
      indices.push(k1 + 1);
    }
  }
  return indices.length;
}
//----------------------------------------------------------------
//法線方向計算ルーチン
function calcNormal(p1, p2, p3, nn)
{
	var A = new Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
	var B = new Vector3(p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]);
	var n = cross(A , B);//外積
	n.norm();
	nn[0] = n.x; nn[1] = n.y; nn[2] = n.z;
}
//--------------------------------------------------------
function makePlateZTex(vertices, texCoords, normals, indices, flagDebug, nRepeatS, nRepeatT)
{
  var i;
  //1辺が1.0の正方形
  //vertices
  var vv = [ 0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0,
            -0.5,-0.5, 0.0,
             0.5,-0.5, 0.0,
             0.5, 0.5, 0.0];
  for(i = 0; i < vv.length; i++) vertices[i] = vv[i];
  //texCoords
  var s = nRepeatS;
  var t = nRepeatT;
  var tt = [ s, 0,
             s, t,
             0, t,
             0, 0,
             s, 0
  ];
  for(i = 0; i < tt.length; i++) texCoords[i] = tt[i];

  //normals
  for(i = 0; i < vv.length; i++)
  {
    normals.push(0.0); normals.push(0.0); normals.push(1.0);
  }
  //indices
  if(flagDebug == false)
  {
    var ii = [ 0, 1, 2,   
               0, 2, 3];
    for(var i = 0; i < ii.length; i++) indices[i] = ii[i];
  }
  else
  {
    var i2 = [ 0, 1, 2, 3, 4];
    for(i = 0; i < i2.length; i++) indices[i] = i2[i];
  }
  return indices.length;
}
//-------------------------------------------------------------------------------------------------------
function makeGridPlateTex(vertices, texCoords, normals, indices, nSliceX, nSliceY, flagDebug, nRepeatS, nRepeatT)
{//1辺が1，xy平面，中心は原点（y方向をs座標に、負のx軸方向をt座標にしている）
  var i, j;
  var pitchX = 1.0 / nSliceX;
  var pitchY = 1.0 / nSliceY;
  var s = nRepeatS * pitchY;//ｙ方向をｓ
  var t = nRepeatT * pitchX;//-ｘ方向をt

  //verdices, normals, texCoords
  for(i = 0; i <= nSliceX; i++)
  {
    for(j = 0; j <= nSliceY; j++)
    {
      //頂点座標
      vertices.push(-i * pitchX + 0.5);//x
      vertices.push(j * pitchY - 0.5); //y
      vertices.push(0.0);              //z
      //テクスチャ座標
      texCoords.push(j * s);//s
      texCoords.push(i * t);//t
      //法線
      normals.push(0.0);//x
      normals.push(0.0);//y
      normals.push(1.0);//z
    }
  }
 
  //indices
  if(!flagDebug)
  {
    for(j = 0; j < nSliceY; j++)
    {
      for(i = 0; i < nSliceX; i++)
      {
        indices.push((nSliceY+1) * i + j);
        indices.push((nSliceY+1) * i + j+1);
        indices.push((nSliceY+1) * (i+1) + j+1);
      
        indices.push((nSliceY+1) * i + j);
        indices.push((nSliceY+1) * (i+1) + j+1);
        indices.push((nSliceY+1) * (i+1) + j);
      }
    }
  }
  else
  {
    for(j = 0; j < nSliceY; j++)
    {
      for(i = 0; i < nSliceX; i++)
      {
        indices.push((nSliceY+1) * i + j); indices.push((nSliceY+1) * i + j+1);
        indices.push((nSliceY+1) * i + j+1);indices.push((nSliceY+1) * (i+1) + j+1);
        indices.push((nSliceY+1) * (i+1) + j+1);indices.push((nSliceY+1) * i + j);
        
        indices.push((nSliceY+1) * (i+1) + j+1);indices.push((nSliceY+1) * (i+1) + j);
        indices.push((nSliceY+1) * (i+1) + j);indices.push((nSliceY+1) * i + j);
      }
    }
  }

  return indices.length;
}

//--------------------------------------------------------------------------------------------------
function makeGridSquareTex(data, vertices, texCoords, normals, indices, nSliceX, nSliceY, flagDebug, nRepeatS, nRepeatT)
{ 
  //例えば2次元バネ-質点モデル全体を1つの四辺形で表現
  //data[k][0]～data[k][2]で格子点iのx,y,z成分が与えられる。
  var s = nRepeatS / nSliceY;//ｙ方向をｓ
  var i, j, k;
  //頂点座標vertices
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      k = i + j * (nSliceX + 1);
      //座標
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z
      //テクスチャ座標
      texCoords.push(j * s);//s
      texCoords.push((1 - i/nSliceX) * nRepeatT);//t
    }
  }

  //法線normals
  //角は1つの三角形、辺は2つの三角形、内部は4個の三角形の平均
  var np, npL, npR, npU, npL;
  var n1 = [], n2 = [], n3 = [], n4 = [];
  
  for(j = 0;j <= nSliceY;j++)
  {
    if(j == 0)
    {
      //i == 0
      np = 0;  npD = 1; npR = nSliceX+1;
      calcNormal(data[np], data[npD], data[npR], n1);
      normals.push(n1[0]);//ｘ
      normals.push(n1[1]);//ｙ
      normals.push(n1[2]);//ｚ
    
      for(i = 1; i < nSliceX; i++)
      {//2つの三角形の平均
        np = i; npR = i+nSliceX+1; npU = i-1; npD = i+1;
        calcNormal(data[np], data[npR], data[npU], n1);
        calcNormal(data[np], data[npD], data[npR], n2);
        normals.push((n1[0] + n2[0]) / 2);//ｘ
        normals.push((n1[1] + n2[1]) / 2);//ｙ
        normals.push((n1[2] + n2[2]) / 2);//ｚ
      }
      //i == nSliceX
      np = nSliceX;  npR = 2*nSliceX+1; npU = nSliceX-1;
      calcNormal(data[np], data[npD], data[npR], n1);
      normals.push(n1[0]);//ｘ
      normals.push(n1[1]);//ｙ
      normals.push(n1[2]);//ｚ 
    }
    else if(j < nSliceY)
    {
      //i = 0
      //2つの三角形の平均
      np = j * (nSliceX + 1); npL = np-(nSliceX+1); npD = np+1; npR = np+(nSliceX+1);
      calcNormal(data[np], data[npL], data[npD], n1);
      calcNormal(data[np], data[npD], data[npR], n2);
      normals.push((n1[0] + n2[0]) / 2);//ｘ
      normals.push((n1[1] + n2[1]) / 2);//ｙ
      normals.push((n1[2] + n2[2]) / 2);//ｚ 
      
      for(i = 1; i < nSliceX; i++)//
      { //隣り合う4個の三角形の法線ベクトルを平均化
        np = i+j*(nSliceX+1); npU = np-1; npD = np+1;
        npL = i+(j-1)*(nSliceX+1); npR = i+(j+1)*(nSliceX+1);
        calcNormal(data[np], data[npU], data[npL], n1);
        calcNormal(data[np], data[npL], data[npD], n2);
        calcNormal(data[np], data[npD], data[npR], n3);
        calcNormal(data[np], data[npR], data[npU], n4);
        normals.push((n1[0] + n2[0] + n3[0] + n4[0]) / 4);//ｘ
        normals.push((n1[1] + n2[1] + n3[1] + n4[1]) / 4);//ｙ
        normals.push((n1[2] + n2[2] + n3[2] + n4[2]) / 4);//ｚ 
      }
      
      //i = nSliceX;
      //2つの三角形の平均
      np = nSliceX+j*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npR = np+(nSliceX+1);
      calcNormal(data[np], data[npU], data[npL], n1);
      calcNormal(data[np], data[npR], data[npU], n2);
      normals.push((n1[0] + n2[0]) / 2);//ｘ
      normals.push((n1[1] + n2[1]) / 2);//ｙ
      normals.push((n1[2] + n2[2]) / 2);//ｚ 
    }
    else//j= nSliceY
    {
      //i == 0
      np = nSliceY*(nSliceX+1); npL = (nSliceY-1)*(nSliceX+1); npD = np+1; 
      calcNormal(data[np], data[npL], data[npD], n1);
      normals.push(n1[0]);//ｘ
      normals.push(n1[1]);//ｙ
      normals.push(n1[2]);//ｚ
    
      for(i = 1; i < nSliceX; i++)
      {//2つの三角形の平均
        np = i+nSliceY*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npD = np+1;
        calcNormal(data[np], data[npU], data[npL], n1);
        calcNormal(data[np], data[npL], data[npD], n2);
        normals.push((n1[0] + n2[0]) / 2);//ｘ
        normals.push((n1[1] + n2[1]) / 2);//ｙ
        normals.push((n1[2] + n2[2]) / 2);//ｚ
      }
      //i == nSliceX
      np = nSliceX+nSliceY*(nSliceX+1); npU = np-1; npL = np-(nSliceX+1);
      calcNormal(data[np], data[npU], data[npL], n1);
      normals.push(n1[0]);//ｘ
      normals.push(n1[1]);//ｙ
      normals.push(n1[2]);//ｚ 
    
    }
  }
  //indices
  var np0, np1, np2, np3;
  //if(flagDebug)//solid model
  for(j = 0; j < nSliceY; j++)
  {
    for(i = 0; i < nSliceX; i++)
    { 
      np0 = i + j*(nSliceX+1); np1 = np0+1; np2 = np1+nSliceX+1; np3 = np2-1;
      if(flagDebug == false)//solid model
      {
        indices.push(np0); indices.push(np1); indices.push(np3);
        indices.push(np1); indices.push(np2); indices.push(np3);
      }
  
      else//wireframe model
      {
        indices.push(np0); indices.push(np1);  indices.push(np1); indices.push(np3);
        indices.push(np3); indices.push(np0);  indices.push(np1); indices.push(np2); 
        indices.push(np2); indices.push(np3);
      }
    }
  }
  return indices.length;
}
//-----------------------------------------------------------------
function makeGridSphereTex(data, vertices, texCoords, normals, indices, nSlice, nStack, nRepeatS, nRepeatT)
{
　//上下の中心が原点
　var i,j;//,ip,im,np,npL,npR,npU,npD,k;
  var s, t;//テクスチャ座標

  //頂点座標
  //j == 0;//Top（nSlice+1個）
  for (i = 0 ;i <= nSlice; i++)
  {
    vertices.push(data[0][0]);//x
    vertices.push(data[0][1]);//y
    vertices.push(data[0][2]);//z
    
    s = i * nRepeatS / nSlice; t = nRepeatT;
    texCoords.push(s);
    texCoords.push(t);
  }
 
　for(j = 1 ;j < nStack;j++)
  {    
    //北極点を1とするt座標
    t = (1.0 - j / nStack) * nRepeatT;
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + (j-1) * nSlice + 1;
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z

      s = i * nRepeatS / nSlice;
      texCoords.push(s);
      texCoords.push(t);     
    }
  }
  k = data.length - 1;
  for(i = 0; i <= nSlice; i++)
  {
    vertices.push(data[k][0]);//x
    vertices.push(data[k][1]);//y
    vertices.push(data[k][2]);//z
      
    s = i * nRepeatS / nSlice; t = 0;
    texCoords.push(s);
    texCoords.push(t);     
  }

  var p1 = [], p2 = [], p3 = [];
  var n1 = [], n2 = [], n3 = [], n4 = [];
  //法線ベクトル
  //Top
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0);//x
    normals.push(0.0);//y
    normals.push(0.0);//z
  }
  //Side
  for(j = 1;j < nStack;j++)//隣り合う4個の三角形の法線ベクトルを平均化
  {
    for(i = 0;i <= nSlice;i++)
    {
      ip = i+1;
	  if(ip == nSlice+1) ip = 1;
	  im = i-1;
	  if(i == 0) im = nSlice-1;

      np  = j*(nSlice+1)+i;//注目点
	  npL = j*(nSlice+1)+im;//左側
	  npR = j*(nSlice+1)+ip;//右側
	  npU = np-nSlice-1;//上
	  npD = np+nSlice+1;//下
      
      p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];
	  p2[0]=vertices[3*npU]; p2[1]=vertices[3*npU+1]; p2[2]=vertices[3*npU+2];
	  p3[0]=vertices[3*npL]; p3[1]=vertices[3*npL+1]; p3[2]=vertices[3*npL+2];
	  calcNormal(p1,p2,p3,n1);//外から見て左上
	  p2[0]=vertices[3*npR]; p2[1]=vertices[3*npR+1]; p2[2]=vertices[3*npR+2];
	  p3[0]=vertices[3*npU]; p3[1]=vertices[3*npU+1]; p3[2]=vertices[3*npU+2];
	  calcNormal(p1,p2,p3,n2);//右上
      p2[0]=vertices[3*npL]; p2[1]=vertices[3*npL+1]; p2[2]=vertices[3*npL+2];
	  p3[0]=vertices[3*npD]; p3[1]=vertices[3*npD+1]; p3[2]=vertices[3*npD+2];
	  calcNormal(p1,p2,p3,n3);//外から見て左下
	  p2[0]=vertices[3*npD]; p2[1]=vertices[3*npD+1]; p2[2]=vertices[3*npD+2];
	  p3[0]=vertices[3*npR]; p3[1]=vertices[3*npR+1]; p3[2]=vertices[3*npR+2];
	  calcNormal(p1,p2,p3,n4);//右下
	  
      normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);//ｘ方向
	  normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);//ｙ
      normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//ｚ
    }
  }
  //Bottom
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0);//x
    normals.push(0.0);//y
    normals.push(0.0);//z
  }

  //インデックス
  var k1, k2;
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
      k1 = j * (nSlice+1) + i;
      k2 = k1 + (nSlice+1);

      indices.push(k1);
      indices.push(k2);
      indices.push(k1 + 1);

      indices.push(k2);
      indices.push(k2 + 1);
      indices.push(k1 + 1);
    }
  }
  return indices.length;
}

//------------------------------------------------------------------------
function makeGridCylinderTex(data, vertices, texCoords, normals, indices, nSlice, nStack, nRepeatS, nRepeatT)
{ //SpringMassModelのDebugモードで使用
　//上下の中心が原点
　var i, i0, j, ip, im, np, npL, npR, npU, npD, k;

  //Topの中心頂点座標
  //座標
  vertices.push(data[0][0]);//x
  vertices.push(data[0][1]);//y
  vertices.push(data[0][2]);//z
  s = 0; 
  t = 1;
  texCoords.push(s);
  texCoords.push(t);   
  
  //Topの円周
  for(i = 0 ; i <= nSlice; i++)
  {
    var i0 = i;
    if(i == nSlice) i0 = 0;
    k = i0 + 1;
    vertices.push(data[k][0]);//x
    vertices.push(data[k][1]);//y
    vertices.push(data[k][2]);//z
   
    s = 0;
    t = 1;
    texCoords.push(s);
    texCoords.push(t);     
  }
  
  //側面(Textureは側面だけ）
　for(j = 0 ; j <= nStack; j++)
  {
    //Topを1とするt座標
    t = (1.0 - j / nStack) * nRepeatT;
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + j * nSlice + 1;
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z
      //if(i < nSlice) cnt++;
      s = i * nRepeatS / nSlice;
      texCoords.push(s);
      texCoords.push(t);     
    }
  }
  //Bottomの円周
  for(i = 0 ; i <= nSlice; i++)
  {
    var i0 = i;
    if(i == nSlice) i0 = 0;
    k = i0 + nStack*nSlice + 1
    vertices.push(data[k][0]);//x
    vertices.push(data[k][1]);//y
    vertices.push(data[k][2]);//z
    s = 0; t = 0;
    texCoords.push(s);
    texCoords.push(t);     
  }
  
  //Bottomの中心座標（nSlice+1個）
  k = data.length-1;
  vertices.push(data[k][0]);//x
  vertices.push(data[k][1]);//y
  vertices.push(data[k][2]);//z
  s = 0; t = 0;
  texCoords.push(s);
  texCoords.push(t);     

  var p1 = [], p2 = [], p3 = [];
  var n1 = [], n2 = [], n3 = [], n4 = [];
  //法線ベクトル
  //Topの中心
  normals.push(0.0);//x
  normals.push(0.0);//y
  normals.push(0.0);//z   
  //Topの円周 
  for(i = 0;i <= nSlice;i++)//隣り合う2個の三角形の法線ベクトルを平均化
  {
    ip = i+1;
    if(ip == nSlice+1) ip = 1;
	im = i-1;
	if(i == 0) im = nSlice-1;

    np  = i + 1;//注目点
	npL = im + 1;//左側
	npR = ip + 1;//右側
	npU = 0;//上
      
    p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];
    p2[0]=vertices[3*npU]; p2[1]=vertices[3*npU+1]; p2[2]=vertices[3*npU+2];
	p3[0]=vertices[3*npL]; p3[1]=vertices[3*npL+1]; p3[2]=vertices[3*npL+2];
	calcNormal(p1,p2,p3,n1);//外から見て左上
	p2[0]=vertices[3*npR]; p2[1]=vertices[3*npR+1]; p2[2]=vertices[3*npR+2];
	p3[0]=vertices[3*npU]; p3[1]=vertices[3*npU+1]; p3[2]=vertices[3*npU+2];
	calcNormal(p1,p2,p3,n2);//右上
	  
    normals.push((n1[0]+n2[0])/2.0);//ｘ方向
	normals.push((n1[1]+n2[1])/2.0);//ｙ
    normals.push((n1[2]+n2[2])/2.0);//ｚ
  }
  var nn = nSlice + 2;//ここまでの頂点数
  //SideのTop
  j = 0;
  for(i = 0;i <= nSlice;i++)//側面のTop
  {//隣り合う2個の三角形の法線ベクトルを平均化
    ip = i+1;
    if(ip == nSlice+1) ip = 1;
	im = i-1;
	if(i == 0) im = nSlice-1;

    np  = j*(nSlice+1)+i + nn;//注目点
	npL = j*(nSlice+1)+im + nn;//左側
	npR = j*(nSlice+1)+ip + nn;//右側
	npD = np+nSlice+1 + nn;//下
   
    p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];	
    p2[0]=vertices[3*npL]; p2[1]=vertices[3*npL+1]; p2[2]=vertices[3*npL+2];
	p3[0]=vertices[3*npD]; p3[1]=vertices[3*npD+1]; p3[2]=vertices[3*npD+2];
	calcNormal(p1,p2,p3,n3);//外から見て左下
	p2[0]=vertices[3*npD]; p2[1]=vertices[3*npD+1]; p2[2]=vertices[3*npD+2];
	p3[0]=vertices[3*npR]; p3[1]=vertices[3*npR+1]; p3[2]=vertices[3*npR+2];
	calcNormal(p1,p2,p3,n4);//右下
	  
    normals.push((n3[0]+n4[0])/2.0);//ｘ方向
	normals.push((n3[1]+n4[1])/2.0);//ｙ
    normals.push((n3[2]+n4[2])/2.0);//ｚ
  }
  //sideの中間  
  for(j = 1;j < nStack;j++)
  {
  　for(i = 0;i <= nSlice;i++)//隣り合う4個の三角形の法線ベクトルを平均化
    {
      ip = i+1;
	  if(ip == nSlice+1) ip = 1;
	  im = i-1;
	  if(i == 0) im = nSlice-1;

      np  = j*(nSlice+1)+i + nn;//注目点
	  npL = j*(nSlice+1)+im + nn;//左側
	  npR = j*(nSlice+1)+ip + nn;//右側
	  npU = np-nSlice-1;//上
	  npD = np+nSlice+1;//下
      
      p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];
      p2[0]=vertices[3*npU]; p2[1]=vertices[3*npU+1]; p2[2]=vertices[3*npU+2];
	  p3[0]=vertices[3*npL]; p3[1]=vertices[3*npL+1]; p3[2]=vertices[3*npL+2];
	  calcNormal(p1,p2,p3,n1);//外から見て左上
	  p2[0]=vertices[3*npR]; p2[1]=vertices[3*npR+1]; p2[2]=vertices[3*npR+2];
	  p3[0]=vertices[3*npU]; p3[1]=vertices[3*npU+1]; p3[2]=vertices[3*npU+2];
	  calcNormal(p1,p2,p3,n2);//右上
	
      p2[0]=vertices[3*npL]; p2[1]=vertices[3*npL+1]; p2[2]=vertices[3*npL+2];
	  p3[0]=vertices[3*npD]; p3[1]=vertices[3*npD+1]; p3[2]=vertices[3*npD+2];
	  calcNormal(p1,p2,p3,n3);//外から見て左下
	  p2[0]=vertices[3*npD]; p2[1]=vertices[3*npD+1]; p2[2]=vertices[3*npD+2];
	  p3[0]=vertices[3*npR]; p3[1]=vertices[3*npR+1]; p3[2]=vertices[3*npR+2];
	  calcNormal(p1,p2,p3,n4);//右下
	  
      normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);//ｘ方向
	  normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);//ｙ
      normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//ｚ
    }
  }

  //sideのbottom
  j = nStack;
  for(i = 0;i <= nSlice;i++)//隣り合う2個の三角形の法線ベクトルを平均化
  {
    ip = i+1;
    if(ip == nSlice+1) ip = 1;
	im = i-1;
	if(i == 0) im = nSlice-1;

    np  = j*(nSlice+1)+i + nn;//注目点
	npL = j*(nSlice+1)+im + nn;//左側
	npR = j*(nSlice+1)+ip + nn;//右側
	npU = np-nSlice-1;//上
      
    p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];
    p2[0]=vertices[3*npU]; p2[1]=vertices[3*npU+1]; p2[2]=vertices[3*npU+2];
	p3[0]=vertices[3*npL]; p3[1]=vertices[3*npL+1]; p3[2]=vertices[3*npL+2];
	calcNormal(p1,p2,p3,n1);//外から見て左上
	p2[0]=vertices[3*npR]; p2[1]=vertices[3*npR+1]; p2[2]=vertices[3*npR+2];
	p3[0]=vertices[3*npU]; p3[1]=vertices[3*npU+1]; p3[2]=vertices[3*npU+2];
	calcNormal(p1,p2,p3,n2);//右上
	  
    normals.push((n1[0]+n2[0])/2.0);//ｘ方向
	normals.push((n1[1]+n2[1])/2.0);//ｙ
    normals.push((n1[2]+n2[2])/2.0);//ｚ
  }
  
  //Bottomの円周
  nn = (nSlice+1) * (nStack+2) + 1;
  for(i = 0;i <= nSlice;i++)
  {//隣り合う2個の三角形の法線ベクトルを平均化
    ip = i+1;
    if(i == nSlice) ip = 1;
	im = i-1;
	if(i == 0) im = nSlice-1;

    np  = i + nn;//注目点
	npL = im + nn;//左側
	npR = ip + nn;//右側
	npD = nSlice + nn+1;//Bottomの中心
    p1[0]=vertices[3*np] ; p1[1]=vertices[3*np+1] ; p1[2]=vertices[3*np+2];	
    p2[0]=vertices[3*npL]; p2[1]=vertices[3*npL+1]; p2[2]=vertices[3*npL+2];
	p3[0]=vertices[3*npD]; p3[1]=vertices[3*npD+1]; p3[2]=vertices[3*npD+2];
	calcNormal(p1,p2,p3,n3);//外から見て左下
	p2[0]=vertices[3*npD]; p2[1]=vertices[3*npD+1]; p2[2]=vertices[3*npD+2];
	p3[0]=vertices[3*npR]; p3[1]=vertices[3*npR+1]; p3[2]=vertices[3*npR+2];
	calcNormal(p1,p2,p3,n4);//右下
	  
    normals.push((n3[0]+n4[0])/2.0);//ｘ方向
	normals.push((n3[1]+n4[1])/2.0);//ｙ
    normals.push((n3[2]+n4[2])/2.0);//ｚ
  }

  //Bottomの中心
  normals.push(0.0);//x
  normals.push(0.0);//y
  normals.push(0.0);//z
 
  //インデックス
  var k1, k2;
  //Top
  for(i = 0; i < nSlice; i++)
  { 
    ip = i + 1;
      if(i == nSlice) ip = 1
      indices.push(0);
      indices.push(i + 1);
      indices.push(ip + 1);
  }
  nn = nSlice + 2;
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
      k1 = j * (nSlice+1) + i + nn ;
      k2 = k1 + (nSlice+1);

      indices.push(k1);
      indices.push(k2);
      indices.push(k1 + 1);

      indices.push(k2);
      indices.push(k2 + 1);
      indices.push(k1 + 1);
    }
  }
  nn = (nStack+2) * (nSlice + 1) + 1;
  //Bottom
  for(i = 0; i < nSlice; i++)
  {
    ip = i + 1;
      indices.push(vertices.length/3-1);//中心点
      indices.push(nn + ip);
      indices.push(nn + i);
  }
  return indices.length;
}





