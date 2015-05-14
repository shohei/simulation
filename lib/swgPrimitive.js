//--------------------------------------------------
//swgPrimitive.js
//--------------------------------------------------

function makeCube(vertices, normals, indices, flagDebug)
{
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
  if(flagDebug == false)//solid model
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
  {//wireframe model
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
function makeSphere(vertices, normals, indices, nSlice, nStack)
{
//直径が1の球(鉛直軸はｚ）
  //nSlice:経度方向(i)分割数
  //nStack:緯度方向(j)分割数

  var i, phi, si, ci;
  var j, theta, sj, cj;
  var r = 0.5;
  
  // 頂点座標を生成する
  for (j = 0; j <= nStack; j++) 
  {
    theta = j * Math.PI / nStack;
    sj = r * Math.sin(theta);
    cj = r * Math.cos(theta);
    for (i = 0; i <= nSlice; i++) 
    {
      phi = i * 2 * Math.PI / nSlice;
      si = Math.sin(phi);
      ci = Math.cos(phi);

      vertices.push(sj * ci);//x
      vertices.push(sj * si);//y
      vertices.push(cj);     //z
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
function makeCylinder(vertices, normals, indices, radiusRatio, nSlice, flagDebug)
{
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
  
  //上底(Top)
  vertices[0] = 0.0; vertices[1] = 0.0; vertices[2] = height/2.0; //中心点
  normals[0]  = 0.0; normals[1]  = 0.0; normals[2]  = 1.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(rTop * Math.cos(phi));//x
    vertices.push(rTop * Math.sin(phi));//y
    vertices.push(height/2.0);          //z
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(1.0); //z
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
    
    for(i = 0; i <= nSlice; i++)
    {
       phi = i * phi0;
       vertices.push(r0 * Math.cos(phi));//x座標
       vertices.push(r0 * Math.sin(phi));//y座標
       vertices.push(hh); //z座標
       
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
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0;//時計回り
    vertices.push(rBottom * Math.cos(phi));//x
    vertices.push(rBottom * Math.sin(phi));//y
    vertices.push(-height/2.0);            //z
    normals.push( 0.0); //x
    normals.push( 0.0); //y
    normals.push(-1.0); //z
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
function makePrism(vertices, normals, indices, radiusRatio, nSlice, flagDebug)
{
  //半径0.5，高さ1.0の円柱に内接する多角柱
  //多角柱(rBottom=rTop))、多角錐台、多角錐(rTop = 0.0)
  //nSlice--xy断面分割数

  var rBottom = 0.5;//下底半径
  var rTop = rBottom * radiusRatio;//上底半径
  var height = 1.0;//高さ

  var i, j;
  var phi, phi2;
  var phi0 = 2.0 * Math.PI/nSlice;
  
  //上底（Top)
  vertices[0] = 0.0; vertices[1] = 0.0; vertices[2] = height/2.0; //中心点
  normals[0]  = 0.0; normals[1]  = 0.0; normals[2]  = 1.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0 + phi0/2;//平らな面が正面を向くようにphi0/2を追加
    vertices.push(rTop * Math.cos(phi));//x
    vertices.push(rTop * Math.sin(phi));//y
    vertices.push(height/2.0);          //z
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(1.0); //z
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
    else      {r0 = rBottom; hh = -height/2.0; }
    for(i = 0; i < nSlice; i++)
    {
      //1つの頂点に番号を2個必要
      phi = i * phi0 + phi0/2;
      phi2 = phi + phi0/2.0;
      //座標 
      vertices.push(r0 * Math.cos(phi));//x座標(外部から見て左側）
      vertices.push(r0 * Math.sin(phi));//y座標
      vertices.push(hh);                //z座標
      vertices.push(r0 * Math.cos(phi+phi0));//x座標（右側）
      vertices.push(r0 * Math.sin(phi+phi0));//y座標
      vertices.push(hh);                     //z座標
       
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
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0 ;//- phi0/2;//時計回り
    vertices.push(rBottom * Math.cos(phi));//x
    vertices.push(rBottom * Math.sin(phi));//y
    vertices.push(-height/2.0);            //z
    normals.push( 0.0); //x
    normals.push( 0.0); //y
    normals.push(-1.0); //z
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
function makeTorus(vertices, normals, indices, radiusRatio, nSlice, nStack)
{	
  var radius1 = 0.5;//円環の中心軸半径(主半径）
  var radius2 = radiusRatio * radius1;//断面半径（副半径）
  //nSlice:円環断面における表面分割点数
  //nStack:円環の分割数
  if(radiusRatio > 1.0) { printf("radiusRatio < 1 としてください"); return;}

  var i, j;
  var rr, zz;
  var theta0, theta1, phi;

  //頂点座標，法線ベクトル
  for(j = 0; j <= nStack; j++)
  {
    //i=0は基本断面(x=radius1を中心とする円, y=0）
    theta0 = 2.0 * Math.PI * j / nStack;
    theta1 = 2.0 * Math.PI * (j+1) / nStack;
　　for(i = 0; i <= nSlice; i++)
    {
      phi = -Math.PI + 2.0 * Math.PI * i / nSlice;
      rr = radius1 + radius2 * Math.cos(phi);//z軸からの距離
      zz = radius2 * Math.sin(phi);
      //頂点のxyz座標(i=0を内側xy平面)
      vertices.push(rr * Math.cos(theta0));//x座標
      vertices.push(rr * Math.sin(theta0));//y
      vertices.push(zz);                   //z
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
//---------------------------------------------
function makeSpring(vertices, normals, indices, radius, ratio, nSlice, nStack, nPitch, len)
{	
  var radius1 = radius ;//円環の中心軸半径(主半径）
  var radius2 = radius * ratio ;//断面半径（副半径）
  //nSlice:円環断面における表面分割点数
  //nStack:円環の分割数
  var pitch = len / nPitch;
  //縮んだときの制限
  if(pitch < 2 * radius2) pitch = 2.0 * radius2 ;
  var dp = pitch / nStack;
//alert("pitch="+pitch +"  dp="+dp);
  var i, j, k;
  var rr, zz;
  var theta0, theta1, phi;
  var phi0 = 2.0 * Math.PI / nSlice;
  
  //頂点座標，法線ベクトル

  //始端（下,負のｙ軸方向）
  vertices[0] = radius1; vertices[1] = 0.0; vertices[2] = -len/2.0; //中心点
  normals[0]  = 0.0; normals[1]  = -1.0; normals[2]  = 0.0;

  var r;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(radius1 + radius2 * Math.cos(phi));//x
    vertices.push(0.0);//y
    vertices.push(radius2 * Math.sin(phi) -len/2.0);//z
    normals.push(0.0); //x
    normals.push(-1.0); //y
    normals.push(0.0); //z
  }

  var hh = dp;
  for(k = 0; k < nPitch; k++)
  {
    hh -= dp;
    for(j = 0; j <= nStack; j++)
    {
      //i=0は基本断面(x=radius1を中心とする円, y=0）
      theta0 = 2.0 * Math.PI * j / nStack;
      theta1 = 2.0 * Math.PI * (j+1) / nStack;
　　  for(i = 0; i <= nSlice; i++)
      {
        phi = -Math.PI + phi0 * i;
        rr = radius1 + radius2 * Math.cos(phi);//z軸からの距離
        zz = radius2 * Math.sin(phi) + hh - len / 2;
        //頂点のxyz座標(i=0を内側xy平面)
        vertices.push(rr * Math.cos(theta0));//x座標
        vertices.push(rr * Math.sin(theta0));//y
        vertices.push(zz);                   //z
        normals.push(Math.cos(phi)*Math.cos(theta0));//x
        normals.push(Math.cos(phi)*Math.sin(theta0));//y
        normals.push(Math.sin(phi));                 //z
      }
      hh += dp;
    }
  }

  var nd = vertices.length;//これまでの頂点データ個数
  //終端（上、正のｙ軸方向)
  vertices[nd] = radius1; vertices[nd+1] = 0.0; vertices[nd+2] = len/2.0; //中心点
  normals[nd]  = 0.0; normals[nd+1]  = 1.0; normals[nd+2]  = 0.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0 ;//時計回り
    vertices.push(radius1 + radius2 * Math.cos(phi));//x
    vertices.push(0.0);//y
    vertices.push(radius2 * Math.sin(phi) + len/2.0);            //z
    normals.push( 0.0); //x
    normals.push( 1.0); //y
    normals.push( 0.0); //z
  }

  //インデックス
  //始端
  for(var i = 0; i < nSlice; i++)
  {
    indices.push(0); indices.push(i+1); indices.push(i+2);
  }
  for(k = 0; k < nPitch; k++)
  {
    for(j = 0; j < nStack; j++)
    {
　　  for(i = 0; i < nSlice; i++)
      {
        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * j + i);
        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * (j+1) + i);
        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * j + i+1);

        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * (j+1) + i);
        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * (j+1) + i+1);
        indices.push(nSlice+2 + (nSlice+1)*(nStack+1)*k + (nSlice+1) * j + i+1);
      }
    }
  }

  //終端 
  var nv = nd / 3; //中心点の頂点番号 
    for(i = 0; i < nSlice; i++)
    {
      indices.push(nv); indices.push(nv+i+1); indices.push(nv+i+2);
    }

  return indices.length;
}

//-----------------------------------------------------------------
function makeSuper(vertices, normals, indices, nSlice, nStack, eps1, eps2)
{
　//上下の中心が原点
　var i,j,ip,im,np,npL,npR,npU,npD,k;
　var ct,theta,phi,z,cc, ss, gg;
　var r = 0.5;//基本球の半径
  //頂点座標
  //j == 0;//Top（nSlice+1個）
  for (i = 0 ;i <= nSlice; i++)
  {
    vertices.push(0.0);//x
    vertices.push(0.0);//y
    vertices.push(r);  //z
  }
 
　for(j = 1 ;j < nStack;j++)
  {
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
	  //if( ct == 0.0 ) cc = 0.0;
	  //else 
      if (ct >= 0) { cc = Math.pow(ct, eps2);}
	  else             { cc = -Math.pow(Math.abs(ct),eps2); }
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
    }//i
  }//j
  //j = nStack:Bottom（nSlice+1個）
  for(i = 0; i <= nSlice; i++)
  {
    vertices.push(0.0);//x
    vertices.push(0.0);//y
    vertices.push(-r); //z
  }
//alert("SUPER nn = " + vertices.length);

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
//----------------------------------------------------------------------------
function makeSuper2(vertices, normals, indices, size1, size2, nSlice, nStack, 
          eps1, eps2, middle, angle, jStart, type)
{	
  //上下の中心が原点
  var i,j,ip,im,np,npL,npR,npU,npD,k;
  var ct,phi,theta,z,fz;
  var cc, xx, yy, zz, aa, sr, cr;

  for(j = 0 ;j <= nStack;j++)
  {
    theta = (Math.PI/nStack) * (nStack / 2 - j);
    if(theta > 0) z = Math.pow(Math.sin(theta),eps1);//z
    else z = - Math.pow(Math.sin(Math.abs(theta)), eps1);
    //形状関数
	if(z < 0.0) fz = (middle-1)*z + middle;
	else fz = (1-middle)*z + middle;

    for (i = 0 ;i <= nSlice ;i++)
    {
      k = (nSlice+1) * j + i;//object自身から見て左側(x > 0)
	  //k2 = nSlice * j + nSlice - i;//右側(x < 0)
	  phi = 2 * Math.PI * i/nSlice;
      ct = Math.cos(phi);
      if (ct >= 0) { cc = Math.pow(ct, eps2);}
      else  { cc = -Math.pow(Math.abs(ct),eps2); }
      if(j == 0 || j == nStack) 
      {
        vertices[3*k] = 0.0;  //x
        vertices[3*k+1] = 0.0;//y
      }
	  else 
	  {
	    if(j <= nStack/2)
		{
		  vertices[3*k] = size1[0] * Math.pow(Math.cos(theta),eps1)*cc*fz;
		  vertices[3*k+1] = size1[1] * Math.pow(Math.cos(theta),eps1)*Math.pow(Math.abs(Math.sin(phi)),eps2)*fz;
		  if(i > nSlice/2) vertices[3*k+1] = - vertices[3*k+1];
        }
		else
		{
		  vertices[3*k] = size2[0] * Math.pow(Math.cos(theta),eps1)*cc*fz;
		  vertices[3*k+1] = size2[1] * Math.pow(Math.cos(theta),eps1)*Math.pow(Math.abs(Math.sin(phi)),eps2)*fz;
		  if(i > nSlice/2) vertices[3*k+1] = - vertices[3*k+1];
		}
      }
	  //if(i == 0) k2 = k;

      //vertices[3*k2] = vertices[3*k];
      //vertices[3*k2+1] = -vertices[3*k+1];
      if(j <= nStack/2)
	  {
		vertices[3*k+2] = size1[2] * z;
		//vertices[3*k2+2] = size1[2] * z;
      }
	  else
	  {
		vertices[3*k+2] = size2[2] * z;
		//vertices[3*k2+2] = size2[2] * z;
      }
    }
  }
//alert("SUPER2 nn = " + vertices.length);

  //変形
  if(type == 0)
  {
	//前方：z軸
	//z軸回転(x>0なら正のz軸回転，x<0なら負のz軸回転）
	for(j = jStart; j <= nStack; j++)
	{
	  for(i = 0; i <= nSlice; i++)
	  {
		k = (nSlice+1) * j + i;//自分から見て左側(x > 0)
		xx = vertices[3*k]; 
        yy = vertices[3*k+1];
		if(j <= nStack/2)
		  aa = Math.PI * angle * Math.abs(xx) / size1[0] / 180.0;
		else
		  aa = Math.PI * angle * Math.abs(xx) / size2[0] / 180.0;
        cr = Math.cos(aa);
		sr = Math.sin(aa);
		if(xx > 0.0)
		{
		  vertices[3*k] = xx * cr - yy * sr;//x
		  vertices[3*k+1] = xx * sr + yy * cr;//y
		}
		else
		{
		  vertices[3*k] = xx * cr + yy * sr ;
		  vertices[3*k+1] = -xx * sr + yy * cr;
		}
      }
	}
  }
  else if(type == 1)
  {
	//前方：z軸
	//後半を上下（x軸回転）
	for(j = jStart; j <= nStack; j++)
	{
      for(i = 0; i <= nSlice; i++)
	  {
		k = (nSlice+1) * j + i;
		yy = vertices[3*k+1]; zz = vertices[3*k+2];
		aa = Math.PI * angle / 180.0 * (j-jStart) / nSlice;
		cr = Math.cos(aa);
		sr = Math.sin(aa);
		vertices[3*k+1] = yy * cr - zz * sr;
		vertices[3*k+2] = yy * sr + zz * cr;
	  }
	}
  }
  else if(type == 2)
  {
	//前方：z軸
	//後半を左右（y軸回転）
	for(j = jStart; j <= nStack; j++)
	{
	  for(i = 0; i <= nSlice; i++)
	  {
		k = (nSlice+1) * j + i;
		xx = vertices[3*k]; zz = vertices[3*k+2];
		aa = Math.PI * angle / 180.0 * (j-jStart) / nSlice;
		cr = Math.cos(aa);
		sr = Math.sin(aa);
		vertices[3*k] = xx * cr + zz * sr;
		vertices[3*k+2] = -xx * sr + zz * cr;
	  }
    }
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

//----------------------------------------------------------
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
function makePlateZ(vertices, normals, indices, flagDebug)
{
  var i;
  //1辺が1.0の正方形
  var vv = [ 0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0,
            -0.5,-0.5, 0.0,
             0.5,-0.5, 0.0,
             0.5, 0.5, 0.0];
  for(i = 0; i < vv.length; i++) vertices[i] = vv[i];
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
    for(var i = 0; i < i2.length; i++) indices[i] = i2[i];
  }
//alert("naaaa= " + indices.length);
  return indices.length;
}

//-------------------------------------------------------
function makeGridPlate(vertices, normals, indices, nSliceX, nSliceY, flagDebug)
{//1辺が1，xy平面，中心は原点
  var i, j;
  var pitchX = 1.0 / nSliceX;
  var pitchY = 1.0 / nSliceY;

  //verdices, normals
  for(i = 0; i <= nSliceX; i++)
  {
    for(j = 0; j <= nSliceY; j++)
    {
      //座標
      vertices.push(i * pitchX - 0.5);//x
      vertices.push(j * pitchY - 0.5);//y
      vertices.push(0.0);             //z
      //法線
      normals.push(0.0);//x
      normals.push(0.0);//y
      normals.push(1.0);//z
    }
  }
  //indices
  if(flagDebug == false)//solid model
  {
    for(j = 0; j < nSliceY; j++)
    {
      for(i = 0; i < nSliceX; i++)
      {
        indices.push((nSliceY+1) * i + j);
        indices.push((nSliceY+1) * (i+1) + j);
        indices.push((nSliceY+1) * i + j+1);
      
        indices.push((nSliceY+1) * (i+1) + j);
        indices.push((nSliceY+1) * (i+1) + j+1);
        indices.push((nSliceY+1) * i + j+1);
      }
    }
  }
  else//wireframe model
  {
    for(j = 0; j < nSliceY; j++)
    {
      for(i = 0; i < nSliceX; i++)
      {
        indices.push((nSliceY+1) * i + j); indices.push((nSliceY+1) * (i+1) + j);
        indices.push((nSliceY+1) * (i+1) + j);indices.push((nSliceY+1) * i + j+1);
        indices.push((nSliceY+1) * i + j+1);indices.push((nSliceY+1) * i + j);
      
        indices.push((nSliceY+1) * (i+1) + j);indices.push((nSliceY+1) * (i+1) + j+1);
        indices.push((nSliceY+1) * (i+1) + j+1);indices.push((nSliceY+1) * i + j+1);
      }
    }
  }
//console.log("nSliceX = " + nSliceX + " nSliceY = " + nSliceY + " len = " + indices.length);
  return indices.length;
}

//-------------------------------------------------------
function makeGridSquare(data, vertices, normals, indices, nSliceX, nSliceY, flagDebug)
{ 
  //例えば2次元バネ-質点モデル全体を1つの四辺形で表現
  //data[k][0]～data[k][2]で格子点iのx,y,z成分が与えられる。
  var i, j, k;
  //頂点座標vertices
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      k = i + j * (nSliceX + 1);
//console.log("k = " + k + " nx = " + nSliceX + " ny = " + nSliceY);
//console.log("BBB k = " + k + " x = " + data[k][0] + " y = " + data[k][1] + " z = " + data[k][2]);
      //座標
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z
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
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = 0;  npD = 1; npR = nSliceX+1;
          calcNormal(data[np], data[npD], data[npR], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ
        }
        else if( i <  nSliceX)
        {//2つの三角形の平均
          np = i; npR = i+nSliceX+1; npU = i-1; npD = i+1;
          calcNormal(data[np], data[npR], data[npU], n1);
          calcNormal(data[np], data[npD], data[npR], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ
        }
        else//i == nSliceX
        {
          np = nSliceX;  npR = 2*nSliceX+1; npU = nSliceX-1;
          calcNormal(data[np], data[npD], data[npR], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ 
        }
      }
    }
    else if(j < nSliceY)
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          //2つの三角形の平均
          np = j * (nSliceX + 1); npL = np-(nSliceX+1); npD = np+1; npR = np+(nSliceX+1);
          calcNormal(data[np], data[npL], data[npD], n1);
          calcNormal(data[np], data[npD], data[npR], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ 
        } 
        else if(i < nSliceX)
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
        else
        {
          //i = nSliceX;
          //2つの三角形の平均
          np = nSliceX+j*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npR = np+(nSliceX+1);
          calcNormal(data[np], data[npU], data[npL], n1);
          calcNormal(data[np], data[npR], data[npU], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ 
        }
      }
    }
    else//j= nSliceY
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = nSliceY*(nSliceX+1); npL = (nSliceY-1)*(nSliceX+1); npD = np+1; 
          calcNormal(data[np], data[npL], data[npD], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ
        }
        else if( i < nSliceX)
        {//2つの三角形の平均
          np = i+nSliceY*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npD = np+1;
          calcNormal(data[np], data[npU], data[npL], n1);
          calcNormal(data[np], data[npL], data[npD], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ
        }
        else
        {
          //i == nSliceX
          np = nSliceX+nSliceY*(nSliceX+1); npU = np-1; npL = np-(nSliceX+1);
          calcNormal(data[np], data[npU], data[npL], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ 
        }
      }
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
      {//gl.LINESで一本ずつ表示（rigidクラスのdraw())
        indices.push(np0); indices.push(np1);  indices.push(np1); indices.push(np3);
        indices.push(np3); indices.push(np0);  indices.push(np1); indices.push(np2); 
        indices.push(np2); indices.push(np3);
      }
    }
  }
  return indices.length;
}

//-------------------------------------------------------
function makeElevation(data, vertices, normals, indices, nSliceX, nSliceY, sizeX, sizeY, flagDebug)
{ 
  //xy座標が固定され、ｚ座標だけが変化する波などを表現するプリミティブ
  //data[k]に格子点(i, j)のz成分が与えられている。
  var pd = [];
  var i, j, k;
  //セルのサイズ
  pitchX = sizeX / nSliceX;
  pitchY = sizeY / nSliceY;
  //頂点座標vertices
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      k = i + j * (nSliceX + 1);
      //座標
      pd.push([(i - nSliceX / 2) * pitchX, (j - nSliceY / 2) * pitchY, data[k]]); 
      vertices.push((i - nSliceX / 2) * pitchX);//x
      vertices.push((j - nSliceY / 2) * pitchY);//y
      vertices.push(data[k]);//z
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
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = 0;  npD = 1; npR = nSliceX+1;
          calcNormal(pd[np], pd[npD], pd[npR], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ
        }
        else if( i <  nSliceX)
        {//2つの三角形の平均
          np = i; npR = i+nSliceX+1; npU = i-1; npD = i+1;
          calcNormal(pd[np], pd[npR], pd[npU], n1);
          calcNormal(pd[np], pd[npD], pd[npR], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ
        }
        else//i == nSliceX
        {
          np = nSliceX;  npR = 2*nSliceX+1; npU = nSliceX-1;
          calcNormal(pd[np], pd[npD], pd[npR], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ 
        }
      }
    }
    else if(j < nSliceY)
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          //2つの三角形の平均
          np = j * (nSliceX + 1); npL = np-(nSliceX+1); npD = np+1; npR = np+(nSliceX+1);
          calcNormal(pd[np], pd[npL], pd[npD], n1);
          calcNormal(pd[np], pd[npD], pd[npR], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ 
        } 
        else if(i < nSliceX)
        { //隣り合う4個の三角形の法線ベクトルを平均化
          np = i+j*(nSliceX+1); npU = np-1; npD = np+1;
          npL = i+(j-1)*(nSliceX+1); npR = i+(j+1)*(nSliceX+1);
          calcNormal(pd[np], pd[npU], pd[npL], n1);
          calcNormal(pd[np], pd[npL], pd[npD], n2);
          calcNormal(pd[np], pd[npD], pd[npR], n3);
          calcNormal(pd[np], pd[npR], pd[npU], n4);
          normals.push((n1[0] + n2[0] + n3[0] + n4[0]) / 4);//ｘ
          normals.push((n1[1] + n2[1] + n3[1] + n4[1]) / 4);//ｙ
          normals.push((n1[2] + n2[2] + n3[2] + n4[2]) / 4);//ｚ 
        }
        else
        {
          //i = nSliceX;
          //2つの三角形の平均
          np = nSliceX+j*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npR = np+(nSliceX+1);
          calcNormal(pd[np], pd[npU], pd[npL], n1);
          calcNormal(pd[np], pd[npR], pd[npU], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ 
        }
      }
    }
    else//j= nSliceY
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = nSliceY*(nSliceX+1); npL = (nSliceY-1)*(nSliceX+1); npD = np+1; 
          calcNormal(pd[np], pd[npL], pd[npD], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ
        }
        else if( i < nSliceX)
        {//2つの三角形の平均
          np = i+nSliceY*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npD = np+1;
          calcNormal(pd[np], pd[npU], pd[npL], n1);
          calcNormal(pd[np], pd[npL], pd[npD], n2);
          normals.push((n1[0] + n2[0]) / 2);//ｘ
          normals.push((n1[1] + n2[1]) / 2);//ｙ
          normals.push((n1[2] + n2[2]) / 2);//ｚ
        }
        else
        {
          //i == nSliceX
          np = nSliceX+nSliceY*(nSliceX+1); npU = np-1; npL = np-(nSliceX+1);
          calcNormal(pd[np], pd[npU], pd[npL], n1);
          normals.push(n1[0]);//ｘ
          normals.push(n1[1]);//ｙ
          normals.push(n1[2]);//ｚ 
        }
      }
    }
  }
  //indices
  var np0, np1, np2, np3;
  
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
      {//gl.LINESで一本ずつ表示（rigidクラスのdraw())
        indices.push(np0); indices.push(np1);  indices.push(np1); indices.push(np3);
        indices.push(np3); indices.push(np0);  indices.push(np1); indices.push(np2); 
        indices.push(np2); indices.push(np3);
      }
    }
  }
  return indices.length;
}

//-------------------------------------------------------
function makeCheckedPlate(vertices, colors, normals, indices, nSliceX, nSliceY, col1, col2)
{
  //xy平面，中心は原点
  var i, j;
  var pitchX = 1.0 / nSliceX;
  var pitchY = 1.0 / nSliceY;

  //verticesColors, normals
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      //座標(同じ座標の頂点を2個ずつ）
      vertices.push(i * pitchX - 0.5);//x
      vertices.push(j * pitchY - 0.5);//y
      vertices.push(0.0);             //z
      vertices.push(i * pitchX - 0.5);//x
      vertices.push(j * pitchY - 0.5);//y
      vertices.push(0.0);             //z
                     
      //色(チェック模様，やはり2個ずつであるが色を変える）
      if(2 * Math.round(i / 2) == i)
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
        else                           
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
      }
      else
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
        else                           
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
      }
      
      //法線(2個の頂点）
      normals.push(0.0); normals.push(0.0); normals.push(1.0);//x,y,z
      normals.push(0.0); normals.push(0.0); normals.push(1.0);//x,y,z
    }
  }
  //indices
  for(j = 0; j < nSliceY; j++)
  {
    for(i = 0; i < nSliceX; i++)
    {
    　var k0 = j * (nSliceX+1) * 2 + i * 2;
      var k1 = k0 + 3;
      var k2 = (j+1) * (nSliceX+1) * 2 + i * 2 +1;
      var k3 = k2 + 1;

      indices.push(k0); indices.push(k1); indices.push(k3);  
      indices.push(k0); indices.push(k3); indices.push(k2);
    }
  }
  return indices.length;

}

//-------------------------------------------------------
function makeCheckedSquare(data, vertices, colors, normals, indices, nSliceX, nSliceY, col1, col2)
{ 
  //例えば2次元バネ-質点モデル全体を1つの四辺形で表現
  //data[k][0]～data[k][2]で格子点iのx,y,z成分が与えられる。
  var i, j, k;
  //頂点座標vertices
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      k = i + j * (nSliceX + 1);
      //座標(同じ座標データを2組）
      vertices.push(data[k][0]); vertices.push(data[k][1]); vertices.push(data[k][2]);//x,y,z
      vertices.push(data[k][0]); vertices.push(data[k][1]); vertices.push(data[k][2]);//x,y,z
      //色(チェック模様，やはり2個ずつであるが色を変える）
      if(2 * Math.round(i / 2) == i)
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
        else                           
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
      }
      else
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
        else                           
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
      }
    }
  }

  //法線normals(やはり2組）
  //角は1つの三角形、辺は2つの三角形、内部は4個の三角形の平均
  var np, npL, npR, npU, npL;
  var n1 = [], n2 = [], n3 = [], n4 = [];
  
  for(j = 0;j <= nSliceY;j++)
  {
    if(j == 0)
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = 0;  npD = 1; npR = nSliceX+1;
          calcNormal(data[np], data[npD], data[npR], n1);
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ
        }
        else if( i < nSliceX)
        {//2つの三角形の平均
          np = i; npR = i+nSliceX+1; npU = i-1; npD = i+1;
          calcNormal(data[np], data[npR], data[npU], n1);
          calcNormal(data[np], data[npD], data[npR], n2);
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ
        }
        else//i == nSliceX
        {
          np = nSliceX;  npR = 2*nSliceX+1; npU = nSliceX-1;
          calcNormal(data[np], data[npD], data[npR], n1);
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ 
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//ｚ 
        }
      }
    }
    else if(j < nSliceY)
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          //2つの三角形の平均
          np = j * (nSliceX + 1); npL = np-(nSliceX+1); npD = np+1; npR = np+(nSliceX+1);
          calcNormal(data[np], data[npL], data[npD], n1);
          calcNormal(data[np], data[npD], data[npR], n2);
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ 
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ 
        } 
        else if(i < nSliceX)
        { //隣り合う4個の三角形の法線ベクトルを平均化
          np = i+j*(nSliceX+1); npU = np-1; npD = np+1;
          npL = i+(j-1)*(nSliceX+1); npR = i+(j+1)*(nSliceX+1);
          calcNormal(data[np], data[npU], data[npL], n1);
          calcNormal(data[np], data[npL], data[npD], n2);
          calcNormal(data[np], data[npD], data[npR], n3);
          calcNormal(data[np], data[npR], data[npU], n4);
          normals.push((n1[0] + n2[0] + n3[0] + n4[0]) / 4); normals.push((n1[1] + n2[1] + n3[1] + n4[1]) / 4); normals.push((n1[2] + n2[2] + n3[2] + n4[2]) / 4);//x,y,ｚ 
          normals.push((n1[0] + n2[0] + n3[0] + n4[0]) / 4); normals.push((n1[1] + n2[1] + n3[1] + n4[1]) / 4); normals.push((n1[2] + n2[2] + n3[2] + n4[2]) / 4);//x,y,ｚ 
        }
        else
        {
          //i = nSliceX;
          //2つの三角形の平均
          np = nSliceX+j*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npR = np+(nSliceX+1);
          calcNormal(data[np], data[npU], data[npL], n1);
          calcNormal(data[np], data[npR], data[npU], n2);
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ 
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ 
        }
      }
    }
    else//j= nSliceY
    {
      for(i = 0; i <= nSliceX; i++)
      {
        if(i == 0)
        {
          np = nSliceY*(nSliceX+1); npL = (nSliceY-1)*(nSliceX+1); npD = np+1; 
          calcNormal(data[np], data[npL], data[npD], n1);
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ
        }
        else if( i < nSliceX)
        {//2つの三角形の平均
          np = i+nSliceY*(nSliceX+1); npL = np-(nSliceX+1); npU = np-1; npD = np+1;
          calcNormal(data[np], data[npU], data[npL], n1);
          calcNormal(data[np], data[npL], data[npD], n2);
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ
          normals.push((n1[0] + n2[0]) / 2); normals.push((n1[1] + n2[1]) / 2); normals.push((n1[2] + n2[2]) / 2);//x,y,ｚ
        }
        else
        {
          //i == nSliceX
          np = nSliceX+nSliceY*(nSliceX+1); npU = np-1; npL = np-(nSliceX+1);
          calcNormal(data[np], data[npU], data[npL], n1);
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ 
          normals.push(n1[0]); normals.push(n1[1]); normals.push(n1[2]);//x,y,ｚ 
        }
      }
    }
  }
  //indices

  for(j = 0; j < nSliceY; j++)
  {
    for(i = 0; i < nSliceX; i++)
    { 
    　var k0 = j * (nSliceX+1) * 2 + i * 2;
      var k1 = k0 + 3;
      var k2 = (j+1) * (nSliceX+1) * 2 + i * 2 +1;
      var k3 = k2 + 1;
      if(flagDebug == false)//solid model
      {
        indices.push(k0); indices.push(k1); indices.push(k3);
        indices.push(k0); indices.push(k3); indices.push(k2);
      }
      else
      {
        indices.push(k0);indices.push(k1);  indices.push(k1);indices.push(k3); 
        indices.push(k3);indices.push(k0);  indices.push(k1);indices.push(k2);
        indices.push(k2);indices.push(k3);  indices.push(k0);indices.push(k2);
      }
      
    }
  }

  return indices.length;
}

//-------------------------------------------------------
function makeStripedPlate(vertices, colors, normals, indices, nSliceX, nSliceY, col1, col2)
{
  //1辺が1の正方形，斜め縞模様
  //xy平面，中心は原点
  var i, j;
  var pitchX = 1.0 / nSliceX;
  var pitchY = 1.0 / nSliceY;

  //verdicesColors, normals
  for(j = 0; j <= nSliceY; j++)
  {
    for(i = 0; i <= nSliceX; i++)
    {
      //座標
      vertices.push(i * pitchX - 0.5);//x
      vertices.push(j * pitchY - 0.5);//y
      vertices.push(0.0);                   //z
                     
      //色
      if(2 * Math.round(i / 2) == i)
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col1[0]);  
          colors.push(col1[1]);
          colors.push(col1[2]);
        }
        else                           
        {
          colors.push(col2[0]);  
          colors.push(col2[1]);
          colors.push(col2[2]);
        }
      }
      else
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col2[0]);  
          colors.push(col2[1]);
          colors.push(col2[2]);
        }
        else                           
        {
          colors.push(col1[0]);  
          colors.push(col1[1]);
          colors.push(col1[2]);
        }
      }
      
      //法線
      normals.push(0.0);//x
      normals.push(0.0);//y
      normals.push(1.0);//z
    }
  }
  //indices
  for(j = 0; j < nSliceY; j++)
  {
    for(i = 0; i < nSliceX; i++)
    {
      indices.push((nSliceX+1) * j + i);
      indices.push((nSliceX+1) * j + i + 1);
      indices.push((nSliceX+1) * (j+1) + i+1);
      
      indices.push((nSliceX+1) * j + i);
      indices.push((nSliceX+1) * (j+1) + i+1);
      indices.push((nSliceX+1) * (j+1) + i);
    }
  }
  return indices.length;

}
//----------------------------------------------------------------------
function makeCylinderX(vertices, normals, indices, nSlice, flagDebug)
{
  //x軸方向に伸びた円柱
  //半径0.5，高さ1.0の円柱
  //rBottom=rTopの底面の中心が原点の円柱
  //nSlice--yz断面分割数
  var rBottom = 0.5;//下底半径
  var rTop = rBottom;//上底半径
  var h0 = 1.0;//高さ
 
  var i, j;
  var phi;
  var phi0 = 2.0*Math.PI/nSlice;
//alert("XXXXXXXX");  
  //上底(Top)
  vertices[0] = h0; vertices[1] = 0.0; vertices[2] = 0.0; //中心点
  normals[0]  = 1.0; normals[1]  = 0.0; normals[2]  = 0.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(h0);                  //x
    vertices.push(rTop * Math.cos(phi));//y
    vertices.push(rTop * Math.sin(phi));//z
    normals.push(1.0); //x
    normals.push(0.0); //y
    normals.push(0.0); //z
  }
  
  //側面(Side)
  var hh, r0;

  for(j = 0; j <= 1; j++)
  {
    if(j == 0) { hh = h0; r0 = rTop; }
    else { hh = 0.0; r0 = rBottom; }
    
    for(i = 0; i <= nSlice; i++)
    {
       phi = i * phi0;
       vertices.push(hh);                //x座標
       vertices.push(r0 * Math.cos(phi));//y座標
       vertices.push(r0 * Math.sin(phi));//z座標
       
       //法線ベクトル
       normals.push(0.0);          //x
       normals.push(Math.cos(phi));//y
       normals.push(Math.sin(phi));//z
    }  
  }
 
  var nd = vertices.length;//これまでの頂点データ個数
  //下底（Bottom)
  vertices[nd] = 0.0; vertices[nd+1] = 0.0; vertices[nd+2] = 0.0; //中心点
  normals[nd]  = -1.0; normals[nd+1]  = 0.0; normals[nd+2]  = 0.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0;//時計回り
    vertices.push(0.0);                    //x
    vertices.push(rBottom * Math.cos(phi));//y
    vertices.push(rBottom * Math.sin(phi));//z
    normals.push(-1.0); //x
    normals.push( 0.0); //y
    normals.push( 0.0); //z
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
function makeCylinderY(vertices, normals, indices, nSlice, flagDebug)
{
  //y軸方向に伸びた円柱
  //半径0.5，高さ1.0の円柱
  //rBottom=rTopの底面の中心が原点の円柱
  //nSlice--xz断面分割数
  
  var rBottom = 0.5;//下底半径
  var rTop = rBottom;//上底半径
  var h0 = 1.0;//高さ
  
  var i, j;
  var phi;
  var phi0 = 2.0*Math.PI/nSlice;
  
  //上底(Top)
  vertices[0] = 0.0; vertices[1] = h0; vertices[2] = 0.0; //中心点
  normals[0]  = 0.0; normals[1]  = 1.0; normals[2]  = 0.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(rTop * Math.sin(phi));//x
    vertices.push(h0);                  //y
    vertices.push(rTop * Math.cos(phi));//z
    normals.push(0.0); //x
    normals.push(1.0); //y
    normals.push(0.0); //z
  }
  
  //側面(Side)
  var hh, r0;

  for(j = 0; j <= 1; j++)
  {
    if(j == 0) { hh = h0; r0 = rTop; }
    else { hh = 0.0; r0 = rBottom; }
    
    for(i = 0; i <= nSlice; i++)
    {
       phi = i * phi0;
       vertices.push(r0 * Math.sin(phi));//x座標
       vertices.push(hh);                //y座標
       vertices.push(r0 * Math.cos(phi));//z座標    
       //法線ベクトル
       normals.push(Math.sin(phi));//x
       normals.push(0.0);          //y
       normals.push(Math.cos(phi));//z
    }  
  }
 
  var nd = vertices.length;//これまでの頂点データ個数
  //下底（Bottom)
  vertices[nd] = 0.0; vertices[nd+1] = 0.0; vertices[nd+2] = 0.0; //中心点
  normals[nd]  = -1.0; normals[nd+1]  = 0.0; normals[nd+2]  = 0.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0;//時計回り
    vertices.push(rBottom * Math.sin(phi));//x
    vertices.push(0.0);                    //y
    vertices.push(rBottom * Math.cos(phi));//z
    normals.push( 0.0); //x
    normals.push(-1.0); //y
    normals.push( 0.0); //z
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
function makeCylinderZ(vertices, normals, indices, nSlice, flagDebug)
{
  //ｚ軸方向に伸びた円柱
  //半径0.5，高さ1.0の円柱
  //rBottom=rTopの底面の中心が原点の円柱
  //nSlice--xy断面分割数
  
  var rBottom = 0.5;//下底半径
  var rTop = rBottom;//上底半径
  var h0 = 1.0;//高さ
  
  var i, j;
  var phi;
  var phi0 = 2.0*Math.PI/nSlice;
  
  //上底(Top)
  vertices[0] = 0.0; vertices[1] = 0.0; vertices[2] = h0; //中心点
  normals[0]  = 0.0; normals[1]  = 0.0; normals[2]  = 1.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = i * phi0;
    vertices.push(rTop * Math.cos(phi));//x
    vertices.push(rTop * Math.sin(phi));//y
    vertices.push(h0);          //z
    normals.push(0.0); //x
    normals.push(0.0); //y
    normals.push(1.0); //z
  }
  
  //側面(Side)
  var hh, r0;

  for(j = 0; j <= 1; j++)
  {
    if(j == 0) { hh = h0; r0 = rTop; }
    else { hh = 0.0; r0 = rBottom; }
    
    for(i = 0; i <= nSlice; i++)
    {
       phi = i * phi0;
       vertices.push(r0 * Math.cos(phi));//x座標
       vertices.push(r0 * Math.sin(phi));//y座標
       vertices.push(hh); //z座標
       
       //法線ベクトル
       normals.push(Math.cos(phi));//x
       normals.push(Math.sin(phi));//y
       normals.push(0.0);          //z
    }  
  }
 
  var nd = vertices.length;//これまでの頂点データ個数
  //下底（Bottom)
  vertices[nd] = 0.0; vertices[nd+1] = 0.0; vertices[nd+2] = 0.0; //中心点
  normals[nd]  = 0.0; normals[nd+1]  = 0.0; normals[nd+2]  = -1.0;
  for(i = 0; i <= nSlice; i++)
  {
    phi = -i * phi0;//時計回り
    vertices.push(rBottom * Math.cos(phi));//x
    vertices.push(rBottom * Math.sin(phi));//y
    vertices.push(0.0);            //z
    normals.push( 0.0); //x
    normals.push( 0.0); //y
    normals.push(-1.0); //z
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
//------------------------------------------------------------------------
function makeGridSphere(data, vertices, normals, indices, nSlice, nStack)
{ //SpringMassModelの"Tex"のDebugモードで使用
　//中心が原点
　var i,j,ip,im,np,npL,npR,npU,npD,k;

  //頂点座標
  //j == 0:Top（nSlice+1個）
  for (i = 0 ; i <= nSlice; i++)
  {//極も複数個の点で表現
    //座標
    vertices.push(data[0][0]);//x
    vertices.push(data[0][1]);//y
    vertices.push(data[0][2]);//z
  }
  //中間
　for(j = 1 ; j < nStack; j++)
  {
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + (j-1) * nSlice + 1;
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z
    }
  }
  //j = nStack:Bottom（nSlice+1個）
  k = data.length - 1;
  for(i = 0; i <= nSlice; i++)
  {
    vertices.push(data[k][0]);//x
    vertices.push(data[k][1]);//y
    vertices.push(data[k][2]);//z
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
  //Bottom
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0); //x
    normals.push(0.0); //y
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

//-----------------------------------------------------------------
function makeCheckedSphere(data, vertices, colors, normals, indices, nSlice, nStack, col1, col2)
{ //SpringMassModelのチェック模様(flagCkeck=falseとすると白色）
　//中心が原点
　var i,j,ip,im,np,npL,npR,npU,npD,k;
  
  var cnt = 0;
  //頂点座標
  //j == 0:Top（nSlice+1個）
  for (i = 0 ; i <= nSlice; i++)
  {//極も複数個の点で表現
    //座標(同じ座標データを2組）
    vertices.push(data[0][0]);vertices.push(data[0][1]);vertices.push(data[0][2]);
    vertices.push(data[0][0]);vertices.push(data[0][1]);vertices.push(data[0][2]);
    //色データ、やはり2個ずつであるが色を変える
    if(2*Math.round(i/2) == i)
    {
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  
    } 
    else
    {
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);   
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);  
    } 
  }
//console.log(" ver.len = " + vertices.length + " col.len = " + colors.length);
  cnt++;
  //中間
　for(j = 1 ; j < nStack; j++)
  {
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + (j-1) * nSlice + 1;
      vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);
      vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);
      
      if(2 * Math.round(i / 2) == i)
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
        else                           
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
      }
      else
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
        else                           
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
      }
    
      if(i < nSlice) cnt++;
    }
  }
//console.log(" cnt = " + cnt + " data.len = " + data.length);
   k = data.length -1;
  //j = nStack:Bottom（nSlice+1個）
  for(i = 0; i <= nSlice; i++)
  {
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);

    if(2*Math.round(i/2) == i)
    {
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  
    } 
    else
    {
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);   
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);  
    } 
   
  }

  var p1 = [], p2 = [], p3 = [];
  var n1 = [], n2 = [], n3 = [], n4 = [];
  //法線ベクトル(やはり2組）
  //Top
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0);normals.push(0.0);normals.push(0.0);
    normals.push(0.0);normals.push(0.0);normals.push(0.0);
  }
  //Side
  for(j = 1;j < nStack;j++)//隣り合う4個の三角形の法線ベクトルを平均化
  for(i = 0;i <= nSlice;i++)
  {
    ip = i+1;
	if(ip == nSlice+1) ip = 1;
	im = i-1;
	if(i == 0) im = nSlice-1;

    np  = j*(nSlice+1)+i  ;//注目点
	npL = j*(nSlice+1)+im ;//左側
	npR = j*(nSlice+1)+ip ;//右側
	npU = np-nSlice-1     ;//上
	npD = np+nSlice+1     ;//下
    
    p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];
    p2[0]=vertices[6*npU]; p2[1]=vertices[6*npU+1]; p2[2]=vertices[6*npU+2];
	p3[0]=vertices[6*npL]; p3[1]=vertices[6*npL+1]; p3[2]=vertices[6*npL+2];
	calcNormal(p1,p2,p3,n1);//外から見て左上
    p2[0]=vertices[6*npR]; p2[1]=vertices[6*npR+1]; p2[2]=vertices[6*npR+2];
	p3[0]=vertices[6*npU]; p3[1]=vertices[6*npU+1]; p3[2]=vertices[6*npU+2];
	calcNormal(p1,p2,p3,n2);//右上
    p2[0]=vertices[6*npL]; p2[1]=vertices[6*npL+1]; p2[2]=vertices[6*npL+2];
    p3[0]=vertices[6*npD]; p3[1]=vertices[6*npD+1]; p3[2]=vertices[6*npD+2];
    calcNormal(p1,p2,p3,n3);//外から見て左下
    p2[0]=vertices[6*npD]; p2[1]=vertices[6*npD+1]; p2[2]=vertices[6*npD+2];
    p3[0]=vertices[6*npR]; p3[1]=vertices[6*npR+1]; p3[2]=vertices[6*npR+2];
    calcNormal(p1,p2,p3,n4);//右下
	  
    normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//x,y,ｚ
    normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//x,y,ｚ
  }
  //Bottom
  for(i = 0;i <= nSlice;i++)
  {
    normals.push(0.0);normals.push(0.0);normals.push(0.0);//x,y,z
    normals.push(0.0);normals.push(0.0);normals.push(0.0);//x,y,z
  }
//console.log("ver_n = " + vertices.length + " nor_n = " + normals.length + " col_n = " + colors.length);
  //インデックス
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
    　var k0 = j * (nSlice+1) * 2 + i * 2;
      var k1 = k0 + (nSlice+1) * 2+1;
      var k2 = k1 +1;
      var k3 = k0 + 3;
      
      indices.push(k0); indices.push(k1); indices.push(k2);
      indices.push(k0); indices.push(k2); indices.push(k3);
    }
  }
//console.log(" ind_n = " + indices.length);
  return indices.length;
}

//------------------------------------------------------------------------
function makeGridCylinder(data, vertices, normals, indices, nSlice, nStack)
{ //SpringMassModelの"Tex"のDebugモードで使用
　//上下の中心が原点
　var i, i0, j, ip, im, np, npL, npR, npU, npD, k;

  //Topの中心頂点座標
  vertices.push(data[0][0]);//x
  vertices.push(data[0][1]);//y
  vertices.push(data[0][2]);//z
  //Topの円周
  for(i = 0 ; i <= nSlice; i++)
  {
    var i0 = i;
    if(i == nSlice) i0 = 0;
    k = i0 + 1;
    vertices.push(data[k][0]);//x
    vertices.push(data[k][1]);//y
    vertices.push(data[k][2]);//z
  }
  
  //側面
　for(j = 0 ; j <= nStack; j++)
  {
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + j * nSlice + 1;
      vertices.push(data[k][0]);//x
      vertices.push(data[k][1]);//y
      vertices.push(data[k][2]);//z
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
  }
  
  //Bottomの中心座標
  k = data.length-1;
  vertices.push(data[k][0]);//x
  vertices.push(data[k][1]);//y
  vertices.push(data[k][2]);//z

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

//------------------------------------------------------------------------
function makeCheckedCylinder(data, vertices, colors, normals, indices, nSlice, nStack, col1, col2)
{ //SpringMassModelのチェック模様(flagCkeck=falseとすると白色）
　//全体の中心が原点
　var i, i0, j, ip, im, np, npL, npR, npU, npD, k;

  //すべての頂点を2組ずつ作成
  //Topの中心頂点座標
  vertices.push(data[0][0]);vertices.push(data[0][1]);vertices.push(data[0][2]);//x,y,z
  vertices.push(data[0][0]);vertices.push(data[0][1]);vertices.push(data[0][2]);//x,y,z
  
  //色データ  
  colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
  colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  
  //Topの円周
  for(i = 0 ; i <= nSlice; i++)
  {
    var i0 = i;
    if(i == nSlice) i0 = 0;
    k = i0 + 1;//このkはデータ番号
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
    //色データ
    if(2*Math.round(i/2) == i)
    {
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
    } 
    else
    {
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);  
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);   
    } 
  }
  
  //側面
　for(j = 0 ; j <= nStack; j++)
  {
    for(i = 0 ; i <= nSlice; i++)
    {
      var i0 = i;
      if(i == nSlice) i0 = 0;
      k = i0 + j * nSlice + 1;
      vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
      vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
      if(2 * Math.round(i / 2) == i)
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
        else                           
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
      }
      else
      {
        if(2 * Math.round(j / 2) == j) 
        {
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
        }
        else                           
        {
          colors.push(col1[0]);  colors.push(col1[1]);　colors.push(col1[2]);
          colors.push(col2[0]);  colors.push(col2[1]);　colors.push(col2[2]);
        }
      }    
    }
  }
  //Bottomの円周
  for(i = 0 ; i <= nSlice; i++)
  {
    var i0 = i;
    if(i == nSlice) i0 = 0;
    k = i0 + nStack*nSlice + 1
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
    vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
    //色データ
    if(2*Math.round(i/2) == i)
    {
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  
    } 
    else
    {
      colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);   
      colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);  
    } 
  }
  
  //Bottomの中心座標
  k = data.length-1;
  vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
  vertices.push(data[k][0]);vertices.push(data[k][1]);vertices.push(data[k][2]);//x,y,z
  //色データ
  colors.push(col1[0]); colors.push(col1[1]);colors.push(col1[2]);   
  colors.push(col2[0]); colors.push(col2[1]);colors.push(col2[2]);  

  var p1 = [], p2 = [], p3 = [];
  var n1 = [], n2 = [], n3 = [], n4 = [];
  //法線ベクトル
  //Topの中心
  normals.push(0.0);normals.push(0.0);normals.push(0.0);//x,y,z   
  normals.push(0.0);normals.push(0.0);normals.push(0.0);//x,y,z   
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
      
    p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];
    p2[0]=vertices[6*npU]; p2[1]=vertices[6*npU+1]; p2[2]=vertices[6*npU+2];
	p3[0]=vertices[6*npL]; p3[1]=vertices[6*npL+1]; p3[2]=vertices[6*npL+2];
	calcNormal(p1,p2,p3,n1);//外から見て左上
	p2[0]=vertices[6*npR]; p2[1]=vertices[6*npR+1]; p2[2]=vertices[6*npR+2];
	p3[0]=vertices[6*npU]; p3[1]=vertices[6*npU+1]; p3[2]=vertices[6*npU+2];
	calcNormal(p1,p2,p3,n2);//右上
	  
    normals.push((n1[0]+n2[0])/2.0);normals.push((n1[1]+n2[1])/2.0);normals.push((n1[2]+n2[2])/2.0);//x,y,ｚ
    normals.push((n1[0]+n2[0])/2.0);normals.push((n1[1]+n2[1])/2.0);normals.push((n1[2]+n2[2])/2.0);//x,y,ｚ
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
   
    p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];	
    p2[0]=vertices[6*npL]; p2[1]=vertices[6*npL+1]; p2[2]=vertices[6*npL+2];
	p3[0]=vertices[6*npD]; p3[1]=vertices[6*npD+1]; p3[2]=vertices[6*npD+2];
	calcNormal(p1,p2,p3,n3);//外から見て左下
	p2[0]=vertices[6*npD]; p2[1]=vertices[6*npD+1]; p2[2]=vertices[6*npD+2];
	p3[0]=vertices[6*npR]; p3[1]=vertices[6*npR+1]; p3[2]=vertices[6*npR+2];
	calcNormal(p1,p2,p3,n4);//右下
	  
    normals.push((n3[0]+n4[0])/2.0);normals.push((n3[1]+n4[1])/2.0);normals.push((n3[2]+n4[2])/2.0);//x,y,ｚ
    normals.push((n3[0]+n4[0])/2.0);normals.push((n3[1]+n4[1])/2.0);normals.push((n3[2]+n4[2])/2.0);//x,y,ｚ
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
      
      p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];
      p2[0]=vertices[6*npU]; p2[1]=vertices[6*npU+1]; p2[2]=vertices[6*npU+2];
	  p3[0]=vertices[6*npL]; p3[1]=vertices[6*npL+1]; p3[2]=vertices[6*npL+2];
	  calcNormal(p1,p2,p3,n1);//外から見て左上
	  p2[0]=vertices[6*npR]; p2[1]=vertices[6*npR+1]; p2[2]=vertices[6*npR+2];
	  p3[0]=vertices[6*npU]; p3[1]=vertices[6*npU+1]; p3[2]=vertices[6*npU+2];
	  calcNormal(p1,p2,p3,n2);//右上
	
      p2[0]=vertices[6*npL]; p2[1]=vertices[6*npL+1]; p2[2]=vertices[6*npL+2];
	  p3[0]=vertices[6*npD]; p3[1]=vertices[6*npD+1]; p3[2]=vertices[6*npD+2];
	  calcNormal(p1,p2,p3,n3);//外から見て左下
	  p2[0]=vertices[6*npD]; p2[1]=vertices[6*npD+1]; p2[2]=vertices[6*npD+2];
	  p3[0]=vertices[6*npR]; p3[1]=vertices[6*npR+1]; p3[2]=vertices[6*npR+2];
	  calcNormal(p1,p2,p3,n4);//右下
	  
      normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//x,y,ｚ
      normals.push((n1[0]+n2[0]+n3[0]+n4[0])/4.0);normals.push((n1[1]+n2[1]+n3[1]+n4[1])/4.0);normals.push((n1[2]+n2[2]+n3[2]+n4[2])/4.0);//x,y,ｚ
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
      
    p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];
    p2[0]=vertices[6*npU]; p2[1]=vertices[6*npU+1]; p2[2]=vertices[6*npU+2];
	p3[0]=vertices[6*npL]; p3[1]=vertices[6*npL+1]; p3[2]=vertices[6*npL+2];
	calcNormal(p1,p2,p3,n1);//外から見て左上
	p2[0]=vertices[6*npR]; p2[1]=vertices[6*npR+1]; p2[2]=vertices[6*npR+2];
	p3[0]=vertices[6*npU]; p3[1]=vertices[6*npU+1]; p3[2]=vertices[6*npU+2];
	calcNormal(p1,p2,p3,n2);//右上
	  
    normals.push((n1[0]+n2[0])/2.0);normals.push((n1[1]+n2[1])/2.0);normals.push((n1[2]+n2[2])/2.0);//x,y,ｚ
    normals.push((n1[0]+n2[0])/2.0);normals.push((n1[1]+n2[1])/2.0);normals.push((n1[2]+n2[2])/2.0);//x,y,ｚ
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
    p1[0]=vertices[6*np] ; p1[1]=vertices[6*np+1] ; p1[2]=vertices[6*np+2];	
    p2[0]=vertices[6*npL]; p2[1]=vertices[6*npL+1]; p2[2]=vertices[6*npL+2];
	p3[0]=vertices[6*npD]; p3[1]=vertices[6*npD+1]; p3[2]=vertices[6*npD+2];
	calcNormal(p1,p2,p3,n3);//外から見て左下
	p2[0]=vertices[6*npD]; p2[1]=vertices[6*npD+1]; p2[2]=vertices[6*npD+2];
	p3[0]=vertices[6*npR]; p3[1]=vertices[6*npR+1]; p3[2]=vertices[6*npR+2];
	calcNormal(p1,p2,p3,n4);//右下
	  
    normals.push((n3[0]+n4[0])/2.0);normals.push((n3[1]+n4[1])/2.0);normals.push((n3[2]+n4[2])/2.0);//x,y,ｚ
    normals.push((n3[0]+n4[0])/2.0);normals.push((n3[1]+n4[1])/2.0);normals.push((n3[2]+n4[2])/2.0);//x,y,ｚ
  }

  //Bottomの中心
  normals.push(0.0);normals.push(0.0);normals.push(0.0);//z
  normals.push(0.0);normals.push(0.0);normals.push(0.0);//z
 
  //インデックス
  var k1, k2;
  //Top
  for(i = 0; i < nSlice; i++)
  { 
    ip = i + 1;
    if(i == 2 * Math.round(i/2)) j = 1; else j = 0;
    indices.push(j);indices.push(2*i+2);indices.push(2*ip+3);
  }

  nn = (nSlice + 2) * 2;
  for (j = 0; j < nStack; j++)
  {
    for (i = 0; i < nSlice; i++) 
    {
    　var k0 = j * (nSlice+1) * 2 + i * 2 + nn;
      var k1 = k0 + (nSlice+1) * 2+1;
      var k2 = k1 +1;
      var k3 = k0 + 3;
      
      indices.push(k0); indices.push(k1); indices.push(k2);
      indices.push(k0); indices.push(k2); indices.push(k3);
    }
  }

  nn = ((nStack+2) * (nSlice + 1) + 1) * 2;
  //Bottom
  for(i = 0; i < nSlice; i++)
  {
    ip = i + 1;
    if(i == 2 * Math.round(i/2)) j = 1; else j = 0;
    indices.push(vertices.length/3-1-j);//中心座標
    indices.push(nn + 2*ip+1);indices.push(nn + 2*i);
  }
  return indices.length;
}

