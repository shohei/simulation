/*----------------------------------------------
     cavityFS.js
     速度-圧力法（フラクショナル・ステップ法）
     スタガード格子
     粒子アニメーション
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var elapseTimeN = 0.0;//無次元時間
var elapseTimeN0 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagStep = false;
var flagReset = false;

//数値計算
var Prs = [];//圧力
var velX = [];//staggered格子点のx速度
var velY = [];//staggered格子点のy速度
var velXgx = [];//速度微分
var velXgy = [];//速度微分
var velYgx = [];//速度微分
var velYgy = [];//速度微分
var VelX = [];//格子点の速度（表示格子点は圧力と同じ格子点）
var VelY = [];//格子点の速度（表示格子点は圧力と同じ格子点）
var Psi = [];//流れ関数（y速度で計算）
var Omg = [];//渦度（x,y速度で計算）

var type = []; //格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagPressIso = false;
var flagPressCol = false;
var flagStream = true;
var flagVorticity = true;
var flagVelocity = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

var deltaT = 0.01;
var Re = 500.0;//レイノルズ数

var maxPsi = 0.02;
var minPsi = -0.1;
var maxOmg = 20.0;
var minOmg = -21.0;
var maxPrs = 1.0;
var minPrs = -0.4;
//粒子アニメーション
var sizeParticle = 5;
var speedCoef = 1.0;//速度倍率
var intervalP = 0.05;

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.8;//表示倍率
  this.nMeshX = 40;//x方向割数（固定）
  this.nMeshY = 40; //y方向分割数（固定）
  this.size = new Vector3(1, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
  //this.delta = new Vector3(); //格子間隔
}
var rect = new Rect();
var NX, NY, DX, DY;

function webMain() 
{
  //canvas要素を取得する
  canvas = document.getElementById('WebGL');
  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  
  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
    alert("GLSLの初期化に失敗");
    return;
  }
  
  //canvasをクリアする色を設定する
  gl.clearColor(1, 1, 1, 1);
  form1.deltaT.value = deltaT;
  form1.Re.value = Re;
  form1.nMeshX.value = rect.nMeshX;
  form1.nMeshY.value = rect.nMeshY;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.psi.checked = flagStream;
  form2.omega.checked = flagVorticity;
  form2.velocity.checked = flagVelocity;
  form2.maxPsi.value = maxPsi;
  form2.minPsi.value = minPsi;
  form2.maxOmg.value = maxOmg;
  form2.minOmg.value = minOmg;
  form2.maxPrs.value = maxPrs;
  form2.minPrs.value = minPrs;

var aa = 1.8; var bb = 2.3;
var cc= Math.round(aa);
var dd = Math.round(bb);
console.log("cc = " + cc + " dd = " + dd);

  
  initData();

  var timestep = 0;
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    { 
      elapseTime += frameTime;
      elapseTimeN += deltaT;//数値計算上の経過時間（無次元時間）
        
      calculate(); 
      gl.clear(gl.COLOR_BUFFER_BIT);
      if(form2.particle.checked) drawParticle(timestep);  
      display();
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      elapseTimeN0 = elapseTimeN;//現在の経過時間を保存
      
      form1.e_time.value = elapseTime.toString();
      form1.n_time.value = elapseTimeN.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();

}

function initData()
{
  deltaT = parseFloat(form1.deltaT.value);
  Re = parseFloat(form1.Re.value);
  rect.nMeshX = parseInt(form1.nMeshX.value);
  NX = rect.nMeshX + 2;
  rect.nMeshY = parseInt(form1.nMeshY.value);
  NY = rect.nMeshY + 2;

  DX = rect.size.x / rect.nMeshX;//格子間隔
  DY = rect.size.y / rect.nMeshY;

  initParticle();//粒子アニメーションの初期化
  
  var i, j;
  
  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    Psi[i] = [];  //流れ関数
    Prs[i] = [];  //圧力
    Omg[i] = [];  //渦度
    VelX[i] = []; //ｘ方向速度
    VelY[i] = []; //ｙ方向速度
    velX[i] = [];
    velY[i] = [];
    velXgx[i] = [];   //ｘ方向微分
    velXgy[i] = [];   //ｙ方向微分
    velYgx[i] = [];   //ｘ方向微分
    velYgy[i] = [];   //ｙ方向微分
  }  

  //step1(初期条件)
  for(j = 0; j <= NY; j++)
	for (i = 0; i <= NX; i++)
	{
	  Prs[i][j] = 0.0;//圧力
	  velX[i][j] = 0.0;//解析用速度
	  velY[i][j] = 0.0;//解析用速度
	  velXgx[i][j] = 0.0;//CIPで利用する速度の微分
	  velXgy[i][j] = 0.0;//
	  velYgx[i][j] = 0.0;//
	  velYgy[i][j] = 0.0;//
	  VelX[i][j] = 0;//表示用速度
	  VelY[i][j] = 0;//表示用速度
	  Psi[i][j] = 0.0;//流れ関数
	  Omg[i][j] = 0.0;//渦度
	}

  maxPrs0 = -1000.0; minPrs0 = 1000.0;
  maxPsi0 = -1000.0; minPsi0 = 1000.0;
  maxOmg0 = -1000.0; minOmg0 = 1000.0;

  //発散しないための目安を知るため
  var courant, diffNum;
  if(DX < DY)
  {
    courant = 1.0 * deltaT / DX;	
	diffNum = (1.0 / Re) * deltaT / (DX * DX);//拡散数
  }
  else
  {
 	courant = 1.0 * deltaT / DY;	
	diffNum = (1.0 / Re) * deltaT / (DX * DY);//拡散数
  }
  form1.courant.value = courant;
  form1.diffNum.value = diffNum;

  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function display()
{
  if(!flagStart) gl.clear(gl.COLOR_BUFFER_BIT);
  flagPressIso = form2.pressIso.checked;
  flagPressCol = form2.pressCol.checked;
  flagStream = form2.psi.checked;
  flagVorticity = form2.omega.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

  //流線、等渦度線、圧力表示
  maxPrs = parseFloat(form2.maxPrs.value);
  minPrs = parseFloat(form2.minPrs.value);
  maxPsi = parseFloat(form2.maxPsi.value);
  minPsi = parseFloat(form2.minPsi.value);
  maxOmg = parseFloat(form2.maxOmg.value);
  minOmg = parseFloat(form2.minOmg.value);
  if( flagPressCol) drawColormapP(Prs, minPrs, maxPrs);
  if( flagPressIso) drawPressureIso(Prs, minPrs, maxPrs, "black");
  if( flagVorticity ) drawContour(Omg, minOmg, maxOmg, "blue");
  if( flagStream ) drawContour(Psi, minPsi, maxPsi, "red");
  if( flagVorticity ) drawContour(Omg, minOmg, maxOmg, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
}

function drawRegion()
{
  var s1, s2;
  if(canvas.width >= canvas.height) 
  {
    s1 = height_per_width;
    s2 = 1.0;
  }
  else
  {
    s1 = 1.0;
    s2 = 1 / height_per_width;
  }

  scale.x = rect.scale * s1;
  scale.y = rect.scale * s2;
  var sx = scale.x * rect.size.x / 2;//ダクトの幅は2*sx
  var sy = scale.y * rect.size.y / 2;//ダクトの高さは2*sy
  //壁境界
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  //圧力境界
  var sxp = scale.x * (rect.size.x+DX) / 2;
  var syp = scale.y * (rect.size.y+DY) / 2;
  drawRectangle(0, 0, 2*sxp, 2*syp, false, "gray", 0);
  //ダクトの左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy;
}

function calculate()
{
  var i, j;
  var iteration = 10;//最大繰り返し回数(Poisson方程式）
  var tolerance = 0.00001;//許容誤差
  var error = 0.0;
  var maxError = 0.0;
  var pp;
  var DX2 = DX * DX;
  var DY2 = DY * DY;
  //var DD2 = DX2 + DY2;//corner
  var A1 = 0.5 * DY2 / (DX2 + DY2);
  var A2 = 0.5 * DX2 / (DX2 + DY2);
  var A3 = 0.25 * DX2*DY2 / (DX2 + DY2);

  //step2(速度の境界条件）
  //上下
  for (i = 0; i <= NX; i++) 
  {
	velY[i][0] = velY[i][2];
	velY[i][1] = 0.0;
	velX[i][0] = - velX[i][1];

    velX[i][NY-1] = 2.0 - velX[i][NY-2];//上境界の速度を1とする(平均値が1となる)
	velY[i][NY] =  velY[i][NY-2];
	velY[i][NY-1] = 0.0;
  }
  //左右
  for (j = 0; j <= NY; j++) 
  {
	velX[0][j] = velX[2][j];
	velX[1][j] = 0.0;
	velY[0][j] = - velY[1][j];

	velX[NX][j] = velX[NX-2][j];
	velX[NX-1][j] = 0.0;
	velY[NX-1][j] = -velY[NX-2][j];
  }

  //step3(CIPによる速度輸送方程式)
  var vel = [];
  for(i = 0; i <= NX; i++) vel[i] = [];
  //x方向速度定義点における速度
  for(i = 1; i < NX; i++)
    for(j = 1; j < NY; j++) 
	  vel[i][j] = (velY[i-1][j] + velY[i][j] + velY[i-1][j+1] + velY[i][j+1]) / 4.0;

  methodCIP(velX, velXgx, velXgy, velX, vel);
	
  //y成分
  //y方向速度定義点における速度
  for(i = 1; i < NX; i++)
    for(j = 1; j < NY; j++)
	  vel[i][j] = (velX[i][j] + velX[i][j-1] + velX[i+1][j-1] + velX[i+1][j]) / 4.0;
	
  methodCIP(velY, velYgx, velYgy, vel, velY);

  //step4(Poisson方程式の解)
  //Poisson方程式の右辺
  var D = [];
  for(i = 0; i <= NX; i++) D[i] = [];
	
  for (j = 1; j < NY-1; j++)
	for (i = 1; i < NX-1; i++)
	{
	  a = (velX[i+1][j] - velX[i][j]) / DX;
	  b = (velY[i][j+1] - velY[i][j]) / DY;
	  D[i][j] = A3 * (a + b) / deltaT;
	}

  //反復法
  var cnt = 0;
  while (cnt < iteration)
  {
	maxError = 0.0;

	//圧力境界値
	for (j = 1; j < NY; j++) 
    {
	  Prs[0][j] = Prs[1][j] - 2.0 * velX[0][j] / (DX * Re);//左端
	  Prs[NX-1][j] = Prs[NX-2][j] + 2.0 * velX[NX][j] / (DX * Re);//右端
	}
	for (i = 1; i < NX; i++)
    {
	  Prs[i][0] = Prs[i][1] - 2.0 * velY[i][0] / (DY * Re) ;//下端
	  Prs[i][NY-1] = Prs[i][NY-2] + 2.0 * velY[i][NY] / (DY * Re);//上端
	}				
	
	for (j = 1; j < NY-1; j++)
	  for (i = 1; i < NX-1; i++)
	  {
		pp = A1 * (Prs[i+1][j] + Prs[i-1][j]) + A2 * (Prs[i][j+1] + Prs[i][j-1]) - D[i][j];
		error = Math.abs(pp -  Prs[i][j]);
		if (error > maxError) maxError = error;
		Prs[i][j] = pp;//更新 
	  }
	if (maxError < tolerance) break;

	cnt++;
  }
  console.log("cnt= " + cnt + " error = " + error);

  //step5(スタガード格子点の速度ベクトルの更新）
  for (j = 1; j < NY-1; j++)
	for(i = 2; i < NX-1; i++)
	{	        
	  velX[i][j] += - deltaT * (Prs[i][j] - Prs[i-1][j]) / DX;
	}
  for (j = 2; j < NY-1; j++)
	for(i = 1; i < NX-1; i++)
	{
	  velY[i][j] += - deltaT * (Prs[i][j] - Prs[i][j-1]) / DY;
	}

  //表示のための速度は圧力と同じ位置で
  for(j = 1; j <= NY-2; j++)
	for(i = 1; i <= NX-2; i++)
	{
	  VelX[i][j] = (velX[i][j] + velX[i+1][j]) / 2.0;
	  VelY[i][j] = (velY[i][j] + velY[i][j+1]) / 2.0;
	}

  //Psi
  for(j = 0; j < NY-1; j++)
  {
	Psi[0][j] = 0.0;
	for (i = 1; i <= NX-1; i++)
	  Psi[i][j] = Psi[i-1][j] - DX * (velY[i-1][j] + velY[i][j]) / 2.0;
  }
  //Omega
  for(i = 1; i <= NX-1; i++)
	for (j = 1; j <= NY-1; j++) 
	{
	  Omg[i][j] = 0.5 * ((VelY[i+1][j] - VelY[i-1][j]) / DX - (VelX[i][j+1] - VelX[i][j-1]) / DY);
	}


  //流れ関数，圧力、渦度の最小値，最大値
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++)
	{
	  if(Prs[i][j] > maxPrs0) maxPrs0 = Prs[i][j];
	  if(Prs[i][j] < minPrs0) minPrs0 = Prs[i][j];
	  if(Psi[i][j] > maxPsi0) maxPsi0 = Psi[i][j];
	  if(Psi[i][j] < minPsi0) minPsi0 = Psi[i][j];
	  if(Omg[i][j] > maxOmg0) maxOmg0 = Omg[i][j];
	  if(Omg[i][j] < minOmg0) minOmg0 = Omg[i][j];
	}

console.log("maxPrs = " + maxPrs0 + " minPrs = " + minPrs0);
console.log("maxPsi = " + maxPsi0 + " minPsi = " + minPsi0);
console.log("maxOmg = " + maxOmg0 + " minOmg = " + minOmg0);

}

function methodCIP(f, gx, gy, vx, vy)
{
  var newF = [];//関数
  var newGx = [];//x方向微分
  var newGy = [];//y方向微分
  
  var i, j, ip, jp;
  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    newF[i] = [];
    newGx[i] = [];
    newGy[i] = [];
  }

  var c11, c12, c21, c02, c30, c20, c03, a, b, sx, sy, x, y, dx, dy, dx2, dy2, dx3, dy3; 

  var i, j, ip, jp;
  for(i = 1; i < NX; i++)
	for(j = 1; j < NY; j++)
	{
	  if(vx[i][j] >= 0.0) sx = 1.0; else sx = -1.0;
	  if(vy[i][j] >= 0.0) sy = 1.0; else sy = -1.0;

	  x = - vx[i][j] * deltaT;
	  y = - vy[i][j] * deltaT;
	  ip = i - sx;//上流点
	  jp = j - sy;
	  dx = sx * DX;
	  dy = sy * DY;
	  dx2 = dx * dx;
	  dy2 = dy * dy;
	  dx3 = dx2 * dx;
	  dy3 = dy2 * dy;

	  c30 = ((gx[ip][j] + gx[i][j]) * dx - 2.0 * (f[i][j] - f[ip][j])) / dx3;
	  c20 = (3.0 * (f[ip][j] - f[i][j]) + (gx[ip][j] + 2.0 * gx[i][j]) * dx) / dx2;
	  c03 = ((gy[i][jp] + gy[i][j]) * dy - 2.0 * (f[i][j] - f[i][jp])) / dy3;
	  c02 = (3.0 * (f[i][jp] - f[i][j]) + (gy[i][jp] + 2.0 * gy[i][j]) * dy) / dy2;
	  a = f[i][j] - f[i][jp] - f[ip][j] + f[ip][jp];
	  b = gy[ip][j] - gy[i][j];
	  c12 = (-a - b * dy) / (dx * dy2);
	  c21 = (-a - (gx[i][jp] - gx[i][j]) * dx) / (dx2*dy);
	  c11 = -b / dx + c21 * dx;
	
      newF[i][j] = f[i][j] + ((c30 * x + c21 * y + c20) * x + c11 * y + gx[i][j]) * x
                 + ((c03 * y + c12 * x + c02) * y + gy[i][j]) * y;

      newGx[i][j] = gx[i][j] + (3.0 * c30 * x + 2.0 * (c21 * y + c20)) * x + (c12 * y + c11) * y;
      newGy[i][j] = gy[i][j] + (3.0 * c03 * y + 2.0 * (c12 * x + c02)) * y + (c21 * x + c11) * x;
	
      //粘性項に中央差分
	  newF[i][j] += deltaT * ( (f[i-1][j] + f[i+1][j] - 2.0 * f[i][j]) / dx2 
	             + (f[i][j-1] + f[i][j+1] - 2.0 * f[i][j]) / dy2 ) / Re;
	}

  //更新
  for(j = 1; j < NY; j++)
    for(i = 1; i < NX; i++)
	{
	  f[i][j] = newF[i][j];
	  gx[i][j] = newGx[i][j];
	  gy[i][j] = newGy[i][j];
	}
}


function drawContour(PP, minP, maxP, col)
{
  nLine = parseFloat(form2.nLine.value);
  
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    for(j = 1; j <= NY-2; j++)
	{//(スタガード格子ではi=1,j=1が壁面）
      for(i = 1; i <= NX-2; i++)
	  {//三角形セルに分割
	    p[0] = PP[i][j];    x[0] = i * DX;     y[0] = j * DY;
	    p[1] = PP[i][j+1];  x[1] = i * DX;     y[1] = (j+1) * DY;
	    p[2] = PP[i+1][j+1];x[2] = (i+1) * DX; y[2] = (j+1) * DY;
	    p[3] = PP[i+1][j];  x[3] = (i+1) * DX; y[3] = j * DY;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -1.0; y1 = -1.0; 
					
		  if((p[m] <= pp && pp < p[m+1]) || (p[m] > pp && pp >= p[m+1]))
		  {
            x1 = x[m] + (x[m+1] - x[m]) * (pp - p[m]) / (p[m+1] - p[m]);
			y1 = y[m] + (y[m+1] - y[m]) * (pp - p[m]) / (p[m+1] - p[m]);
          }
		  if((p[m] <= pp && pp <= p[5]) || (p[m] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y1 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			}
			else//x1は見つかった
            {
			  x2 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y2 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			  data.push(rect.left0.x + scale.x * (x1-DX));
			  data.push(rect.left0.y + scale.y * (y1-DY));
			  data.push(rect.left0.x + scale.x * (x2-DX));
			  data.push(rect.left0.y + scale.y * (y2-DY));
			}			
          }
		  if((p[m+1] <= pp && pp <= p[5]) || (p[m+1] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y1 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			}
			else//x1は見つかった
			{
			  x2 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y2 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);			  
			  data.push(rect.left0.x + scale.x * (x1-DX));
			  data.push(rect.left0.y + scale.y * (y1-DY));
			  data.push(rect.left0.x + scale.x * (x2-DX));
			  data.push(rect.left0.y + scale.y * (y2-DY));
	        }
          }
        }//m
	  }//j
	}//i  
  }//k
  drawLines(data, col);
}

function drawPressureIso(PP, minP, maxP, col)
{
  nLine = parseFloat(form2.nLine.value);
  
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    for(j = 0; j <= NY-2; j++)
	{//(スタガード格子ではi=1,j=1が壁面）
      for(i = 0; i <= NX-2; i++)
	  {//三角形セルに分割
	    p[0] = PP[i][j];    x[0] = i * DX;     y[0] = j * DY;
	    p[1] = PP[i][j+1];  x[1] = i * DX;     y[1] = (j+1) * DY;
	    p[2] = PP[i+1][j+1];x[2] = (i+1) * DX; y[2] = (j+1) * DY;
	    p[3] = PP[i+1][j];  x[3] = (i+1) * DX; y[3] = j * DY;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -1.0; y1 = -1.0; 
					
		  if((p[m] <= pp && pp < p[m+1]) || (p[m] > pp && pp >= p[m+1]))
		  {
            x1 = x[m] + (x[m+1] - x[m]) * (pp - p[m]) / (p[m+1] - p[m]);
			y1 = y[m] + (y[m+1] - y[m]) * (pp - p[m]) / (p[m+1] - p[m]);
          }
		  if((p[m] <= pp && pp <= p[5]) || (p[m] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y1 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			}
			else//x1は見つかった
            {
			  x2 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y2 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			  data.push(rect.left0.x + scale.x * (x1-DX/2));
			  data.push(rect.left0.y + scale.y * (y1-DY/2));
			  data.push(rect.left0.x + scale.x * (x2-DX/2));
			  data.push(rect.left0.y + scale.y * (y2-DY/2));
			}			
          }
		  if((p[m+1] <= pp && pp <= p[5]) || (p[m+1] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y1 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			}
			else//x1は見つかった
			{
			  x2 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y2 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);			  
			  data.push(rect.left0.x + scale.x * (x1-DX/2));
			  data.push(rect.left0.y + scale.y * (y1-DY/2));
			  data.push(rect.left0.x + scale.x * (x2-DX/2));
			  data.push(rect.left0.y + scale.y * (y2-DY/2));
	        }
          }
        }//m
	  }//j
	}//i  
  }//k
  drawLines(data, col);
}

function drawColormapP(PP, minP, maxP, col)
{
  var range0 = maxP - minP;
  var x0, y0, x1, y1, x2, y2, x3, y3;
  var pp = [], rr = [], gg = [], bb = [];
  var i, j, k;
  var vertices = [];
  var colors = [];

  for (i = 0; i <= NX-2; i++)
  {
    for (j = 0; j <= NY-2; j++)
    {
	  x0 = rect.left0.x + scale.x * (i-0.5) * DX;     
      y0 = rect.left0.y + scale.y * (j-0.5) * DY;
	  x1 = rect.left0.x + scale.x * (i+0.5) * DX;
      y1 = rect.left0.y + scale.y * (j-0.5) * DY;
	  x2 = rect.left0.x + scale.x * (i+0.5) * DX; 
      y2 = rect.left0.y + scale.y * (j+0.5) * DY;
	  x3 = rect.left0.x + scale.x * (i-0.5) * DX;     
      y3 = rect.left0.y + scale.y * (j+0.5) * DY;

	  pp[0] = (PP[i][j] - minP) / range0; 
	  pp[1] = (PP[i+1][j] - minP) / range0;
	  pp[2] = (PP[i+1][j+1] - minP) / range0; 
	  pp[3] = (PP[i][j+1] - minP) / range0;

      for(k = 0; k < 4; k++)
      {
        if(pp[k] < 0.25)
        {
		  rr[k] = 0.0; gg[k] = 4.0 * pp[k]; bb[k] = 1.0;
		}
		else if(pp[k] < 0.5)
		{
		  rr[k] = 0.0; gg[k] = 1.0; bb[k] = 4.0 * (0.5 - pp[k]);
		}
		else if(pp[k] < 0.75)
		{
		  rr[k] = 4.0 * (pp[k] - 0.5); gg[k] = 1.0; bb[k] = 0.0;
		}
		else
		{
		  rr[k] = 1.0; gg[k] = (1.0 - pp[k]) * 4.0; bb[k] = 0.0;
		}
      }
      //四角形（三角形2個分のデータ）
      vertices.push(x0); vertices.push(y0);
      vertices.push(x1); vertices.push(y1);
      vertices.push(x2); vertices.push(y2);
      vertices.push(x0); vertices.push(y0);
      vertices.push(x2); vertices.push(y2);
      vertices.push(x3); vertices.push(y3);
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[1]); colors.push(gg[1]); colors.push(bb[1]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[3]); colors.push(gg[3]); colors.push(bb[3]); 
    }
  } 
  drawRectangles(vertices, colors);//swgShape2D.jsに実装
}

function drawVelocity()
{
  arrowScale = parseFloat(form2.arrowScale.value);;
  arrowWidth = parseFloat(form2.arrowWidth.value);
  intervalV = parseFloat(form2.intervalV.value);
  var i, j;

  //描画
  var theta, mag, x0, y0;
  for(i = 1; i <= NX-2; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j <= NY-2; j++)
	{
	  if(j % intervalV != 0) continue;

	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  x0 = rect.left0.x + scale.x * (i-0.5) * DX;
      y0 = rect.left0.y + scale.y * (j-0.5) * DY;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  for(i = 1; i < NX-1; i++)//このi=0は速度ｘ格子線のI=1に相当
  {
    drawLine(rect.left0.x + scale.x * i * DX, rect.left0.y,
      rect.left0.x + scale.x * i * DX, rect.left0.y + scale.y * rect.size.y, 1, "black");
  }
  for(j = 1; j < NY-1; j++)//j=0は速度ｙ格子線のJ=1に相当
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * DY,
    rect.left0.x + scale.x * rect.size.x, rect.left0.y + scale.y * j * DY, 1, "black");
  }
}

//-----------------------------------------------------------------
function Particle2D()
{
  this.pos = new Vector3();
  this.vel = new Vector3();
  this.col;
}
var countP = 0;
var pa = [];//particle
var sizeP = 6;
var speedCoef = 0.1;
var numMaxP;//最大個数
var typeP = 1;

function initParticle()
{
  numMaxP = NX * NY;//粒子総数

  var i, j, k;
  //粒子インスタンス
  for(k = 0; k < numMaxP; k++) pa[k] = new Particle2D();
  k = 0;
  //粒子初期配置
  for(j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
	  pa[k].pos = new Vector3(i * DX, j * DY, 0);
	  if(i  < NX / 3)         pa[k].col = "red";
	  else if(i < NX * 2 / 3) pa[k].col = "green";
	  else                    pa[k].col = "blue";
	  k ++;
	}

}

function drawParticle(dt)
{
  flagPoint = true;  
  var k, KR, KG, KB = 0;
  var dataR = []; 
  var dataG = [];
  var dataB = [];
  var vel = new Vector3(); 

  KR = KG = KB = 0;
  for(k = 0; k < numMaxP; k++)
  {
    vel = getVelocityParticle(pa[k].pos);

	if(!flagFreeze) {
      pa[k].pos.x += vel.x * dt * speedCoef;
      pa[k].pos.y += vel.y * dt * speedCoef;
      if(pa[k].pos.x < DX) pa[k].pos.x = DX;
      if(pa[k].pos.x > 1-DX) pa[k].pos.x = 1 - DX;
      if(pa[k].pos.y < DY) pa[k].pos.y = DY;
      if(pa[k].pos.y > 1-DY) pa[k].pos.y = 1 - DY;
    }
    if(pa[k].col == "red")
    { 
      dataR[2*KR] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataR[2*KR+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KR++;
    }
    else if(pa[k].col == "green")
    { 
      dataG[2*KG] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataG[2*KG+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KG++;
    }
    else if(pa[k].col == "blue")
    { 
      dataB[2*KB] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataB[2*KB+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KB++;
    }
  }

  drawPoints(dataR, sizeP, typeP, "red");
  drawPoints(dataG, sizeP, typeP, "green");
  drawPoints(dataB, sizeP, typeP, "blue");
}

function getVelocityParticle(pos)
{
  var vel = new Vector3();

  var i, j, I, J;

  //格子番号を取得
  I = 0; J = 0;
  for(i = 0; i < NX; i++)
  {
	if(i * DX < pos.x && (i+1) * DX > pos.x) I = i;
  }
  for(j = 0; j < NY; j++)
  {
 	if(j * DY < pos.y && (j+1) * DY > pos.y) J = j;
  }
  var a =  pos.x / DX - I;
  var b =  pos.y / DY - J;
  //格子点の速度を線形補間
  vel.x = (1.0 - b) * ((1.0 - a) * VelX[I][J] + a * VelX[I+1][J]) + b * ((1.0 - a) * VelX[I][J+1] + a * VelX[I+1][J+1]);
  vel.y = (1.0 - b) * ((1.0 - a) * VelY[I][J] + a * VelY[I+1][J]) + b * ((1.0 - a) * VelY[I][J+1] + a * VelY[I+1][J+1]);
  return vel;
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onChangeData()
{
  onClickReset();
  initData();
}

function onDisplay()
{
  display();
}
function onClickScale()
{
  rect.scale = parseFloat(form2.scale.value);
  display();
}
//-------------------------------------------------------------
function onClickP()
{ 
  speedCoef = parseFloat(form2.speedCoef.value);
  sizeP= parseFloat(form2.sizeP.value);
  typeP= parseFloat(form2.typeP.value);
}

function onClickStart()
{
  fps = 0;
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  elapseTimeN = 0;
  elapseTimeN0 = 0;
  flagStart = true;
  flagStep = false;
  flagFreeze = false;
  lastTime = new Date().getTime();
}
function onClickFreeze()
{
  flagStart = !flagStart;
  flagFreeze = !flagFreeze;
  
  flagStep = false;
}
function onClickStep()
{
  flagStep = true;
  flagStart = true;
  elapseTime = elapseTime0;
}
function onClickReset()
{
  elapseTime0 = 0;
  elapseTimeN0 = 0;
  flagStart = false;
  flagStep = false;
  initData();
  form1.e_time.value = "0";
  form1.n_time.value = "0";
  display();
}



