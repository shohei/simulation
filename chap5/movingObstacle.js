/*----------------------------------------------
     movingObstacle.js
     レギュラー格子による速度-圧力法（フラクショナル・ステップ法）
     移動する障害物
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
var type = [];//格子点のタイプ
var Prs = [];//圧力
var Omg = [];//渦度（x,y速度で計算）
var velX = [];//格子点のx速度
var velY = [];//格子点のy速度
var velXgx = [];//速度微分
var velXgy = [];//速度微分
var velYgx = [];//速度微分
var velYgy = [];//速度微分
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagPressIso = true;
var flagPressCol = false;
var flagVorticityIso = true;
var flagVorticityCol = false;
var flagVelocity = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

var deltaT = 0.005;
var Re = 3000.0;//レイノルズ数

var maxPrs =  0.5;
var minPrs = -0.5;
var maxOmg = 20.0;
var minOmg = -20.0;

//移動障害物
var obsSpeed = 1;//障害物速度
var obsDir = 1;  //方向（1:右方向、-1:左方向）
var obsPos = new Vector3(0.1, 0.5, 0);//ダクト左下を原点とした位置
var obsVel = new Vector3(1, 0, 0);
var obsRadius;//円運動時の半径
var moveMode = 0;//直線
var flagObsStop = false;//障害物だけ停止

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.8;//表示倍率
  this.nMeshX = 80;//x方向割数（固定）
  this.nMeshY = 80; //y方向分割数（固定）
  this.size = new Vector3(1, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.left0 = new Vector3(-0.5, -0.5, 0);//その左下位置
  this.obs_nX0 = 5;//左端から障害物中心までの距離(格子間隔の整数倍）
  this.obs_nY0 = 20;//下端から障害物中心までの距離(格子間隔の整数倍）
  this.obs_nWX = 6;//障害物の厚さ(ｘ方向,格子間隔の整数倍)
  this.obs_nWY = 6;//障害物の幅(ｙ方向,格子間隔の整数倍)
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
  
  form2.deltaT.value = deltaT;
  form2.Re.value = Re;
  form1.nMeshX.value = rect.nMeshX;
  form1.nMeshY.value = rect.nMeshY;
  form1.obs_x0.value = obsPos.x;
  form1.obs_nWX.value = rect.obs_nWX;
  form1.obs_nWY.value = rect.obs_nWY;
  form2.obs_speed.value = obsSpeed;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.omegaIso.checked = flagVorticityIso;
  form2.omegaCol.checked = flagVorticityCol;
  form2.pressIso.checked = flagVorticityIso;
  form2.pressCol.checked = flagVorticityCol;
  form2.velocity.checked = flagVelocity;
  form2.maxPrs.value = maxPrs;
  form2.minPrs.value = minPrs;
  form2.maxOmg.value = maxOmg;
  form2.minOmg.value = minOmg;
  
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
      elapseTimeN += deltaT;//数値計算上の経過時間
      
      renewObsPos();
      calculate(); 

      gl.clear(gl.COLOR_BUFFER_BIT);
      if(form2.particle.checked) drawParticle(deltaT);//timestep);  
      display();
      
      elapseTime0 = elapseTime;  //現在の経過時間を保存
      elapseTimeN0 = elapseTimeN;//数値計算上の経過時間
      
      form1.e_time.value = elapseTime.toString();
      form1.n_time.value = elapseTimeN.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();

}

function initData()
{
  deltaT = parseFloat(form2.deltaT.value);
  Re = parseFloat(form2.Re.value);
  NX = parseInt(form1.nMeshX.value);
  NY = parseInt(form1.nMeshY.value);
  
  obsSpeed = parseFloat(form2.obs_speed.value);
  obsPos.x = parseFloat(form1.obs_x0.value);//左端からの距離
  obsRadius = rect.size.x / 2 - obsPos.x;//円運動時の半径
  obsPos.y = rect.size.y / 2;
  rect.obs_nWX = parseFloat(form1.obs_nWX.value);
  rect.obs_nWY = parseFloat(form1.obs_nWY.value);
  DX = rect.size.x / NX;//格子間隔
  DY = rect.size.y / NY;
  //障害物の左端・右端・上端・下端の格子単位の位置
  nX1 = Math.round(obsPos.x/DX - rect.obs_nWX/2);//障害物左端
  nX2 = Math.round(obsPos.x/DX + rect.obs_nWX/2);//障害物右端
  nY2 = Math.round(obsPos.y/DY + rect.obs_nWY/2);//障害物上端
  nY1 = Math.round(obsPos.y/DY - rect.obs_nWY/2);//障害物下端

  initParticle();//粒子アニメーションの初期化
 
  var i, j;
  
  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    type[i] = [];
    Prs[i] = [];  //圧力
    Omg[i] = [];  //渦度
    velX[i] = []; //表示用も同じ
    velY[i] = [];
    velXgx[i] = [];//ｘ方向微分
    velXgy[i] = [];//ｙ方向微分
    velYgx[i] = [];//ｘ方向微分
    velYgy[i] = [];//ｙ方向微分
  }  

  //格子点のタイプ
  for(j = 0; j <= NY; j++)
  {
	for(i = 0; i <= NX; i++)
    {
	  type[i][j] = "INSIDE";//内点
	  if(j == 0) type[i][j] = "BOTTOM";//下側壁面
	  if(j == NY) type[i][j] = "TOP";//上側壁面
	  if(i == 0) type[i][j] = "INLET";//流入端
	  if(i == NX) type[i][j] = "OUTLET";//流出端
	  if(i == nX1 && j > nY1 && j < nY2) type[i][j] = "OBS_LEFT";//障害物左端
	  if(i == nX2 && j > nY1 && j < nY2) type[i][j] = "OBS_RIGHT";//障害物右端
	  if(i > nX1 && i < nX2 && j == nY2) type[i][j] = "OBS_TOP";//障害物上端
	  if(i > nX1 && i < nX2 && j == nY1) type[i][j] = "OBS_BOTTOM";//障害物上端
	  if(i > nX1 && i < nX2 && j > nY1 && j < nY2) type[i][j] = "OBSTACLE";//障害物内部
	  //コーナー
	  if(i == nX1 && j == nY1) type[i][j] = "OBS_LL";
	  if(i == nX1 && j == nY2) type[i][j] = "OBS_UL";
	  if(i == nX2 && j == nY1) type[i][j] = "OBS_LR";
	  if(i == nX2 && j == nY2) type[i][j] = "OBS_UR";
	}
  }

  //初期値
  //入口/出口も流速0
  for(j = 0; j <= NY; j++)  
	for (i = 0; i <= NX; i++)
	{
	  //圧力
	  Prs[i][j] = 0.0;
	  //速度
	  velX[i][j] = 0.0;
      velY[i][j] = 0.0;
	  velXgx[i][j] = 0.0;
	  velXgy[i][j] = 0.0;
	  velYgx[i][j] = 0.0;
	  velYgy[i][j] = 0.0;
	  Omg[i][j] = 0.0;//渦度
    }

  maxPrs0 = -1000.0; minPrs0 = 1000.0;
  maxOmg0 = -1000.0; minOmg0 = 1000.0;
  
  calcCourant();
}

function calcCourant()
{
  //発散しないための目安を知るため
  var courant, diffNum;
  if(DX < DY)
  {
    courant = obsSpeed * deltaT / DX;	
	diffNum = (1.0 / Re) * deltaT / (DX * DX);//拡散数
  }
  else
  {
 	courant = obsSpeed * deltaT / DY;	
	diffNum = (1.0 / Re) * deltaT / (DX * DY);//拡散数
  }
  form1.courant.value = courant;
  form1.diffNum.value = diffNum;

  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function renewObsPos()
{
  if(moveMode == 0)//直線モード
  { 
    if(obsPos.x >= 0.9) direction = -1.0;
    if(obsPos.x <= 0.1) direction =  1.0;
    obsVel = new Vector3(direction * obsSpeed, 0, 0);
    //obsPos.add(mul(obsVel, deltaT));
  }
  else//円運動
  {//初期位置は左側
    var xx = rect.size.x/2 - obsPos.x;//中心からの距離（左側で正）
    var yy = obsPos.y - rect.size.y/2;//中心からの距離（上側で正）
    obsVel.x = obsSpeed * yy / obsRadius;
    obsVel.y = obsSpeed * xx / obsRadius;
  }
  //flagObsStop=falseなら位置更新
  if(!flagObsStop) obsPos.add(mul(obsVel, deltaT));
  
  nX1 = Math.round(obsPos.x/DX - rect.obs_nWX/2);//障害物左端位置
  nX2 = Math.round(obsPos.x/DX + rect.obs_nWX/2);//障害物右端位置
  nY2 = Math.round(obsPos.y/DY + rect.obs_nWY/2);//障害物上端位置
  nY1 = Math.round(obsPos.y/DY - rect.obs_nWY/2);//障害物下端位置

  //障害物の新しい格子点のタイプ
  var i, j;
  for(i = 1; i < NX; i++)
	for(j = 1; j < NY; j++)
	{
	  type[i][j] = "INSIDE";//内点
	  if(i == nX1 && j > nY1 && j < nY2) type[i][j] = "OBS_LEFT";//障害物左端
	  if(i == nX2 && j > nY1 && j < nY2) type[i][j] = "OBS_RIGHT";//障害物右端
	  if(i >= nX1 && i <= nX2 && j == nY2) type[i][j] = "OBS_TOP";//障害物上端
	  if(i >= nX1 && i <= nX2 && j == nY1) type[i][j] = "OBS_BOTTOM";//障害物下端
	  if(i > nX1 && i < nX2 && j > nY1 && j < nY2) type[i][j] = "OBSTACLE";//障害物内部
	  if(i == nX1 && j == nY1) type[i][j] = "OBS_LL";//左下
	  if(i == nX1 && j == nY2) type[i][j] = "OBS_UL";
	  if(i == nX2 && j == nY1) type[i][j] = "OBS_LR";
	  if(i == nX2 && j == nY2)  type[i][j] = "OBS_UR";
	}
}

function display()
{
  if(!flagStart) gl.clear(gl.COLOR_BUFFER_BIT);
  flagPressIso = form2.pressIso.checked;
  flagPressCol = form2.pressCol.checked;
  flagVorticityIso = form2.omegaIso.checked;
  flagVorticityCol = form2.omegaCol.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

　//流線、等渦度線、圧力表示
  maxOmg = parseFloat(form2.maxOmg.value);
  minOmg = parseFloat(form2.minOmg.value);
  maxPrs = parseFloat(form2.maxPrs.value);
  minPrs = parseFloat(form2.minPrs.value);
  if( flagPressCol) drawColormap(Prs, minPrs, maxPrs);
  if( flagVorticityCol) drawColormap(Omg, minOmg, maxOmg);
  if( flagPressIso) drawContour(Prs, minPrs, maxPrs, "black");
  if( flagVorticityIso ) drawContour(Omg, minOmg, maxOmg, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();

  //計算領域
  //drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  drawRectangle(0, 0, scale.x * rect.size.x, scale.x * rect.size.x, false, "black", 0);

  //障害物の位置(表示スケーリング後）
  var x_obs = rect.left0.x + obsPos.x * scale.x; 
  var y_obs = rect.left0.y + obsPos.y * scale.y; 
  drawRectangle(x_obs, y_obs, rect.obs_nWX * DX * scale.x, rect.obs_nWY * DY * scale.y, true, "light_gray", 0);
  drawRectangle(x_obs, y_obs, rect.obs_nWX * DX * scale.x, rect.obs_nWY * DY * scale.y, false, "black", 0);
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
  //計算領域
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  
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
  var A1 = 0.5 * DY2 / (DX2 + DY2);
  var A2 = 0.5 * DX2 / (DX2 + DY2);
  var A3 = 0.25 * DX2*DY2 / (DX2 + DY2);
  var a, b, pp;
 
  //速度境界条件
  //壁境界に対してはすべてDirihlet条件なのでinitObject()ルーチンで与えておけばよい

  //障害物
  for (j = 1; j < NY; j++) 
    for (i = 1; i < NX; i++)
	{
	  if(type[i][j] == "INSIDE") continue;
	  {
	    if(flagObsStop)
	    {  velX[i][j] = 0; velY[i][j] = 0; }
	    else
	    {
	      velX[i][j] = obsVel.x;
	      velY[i][j] = obsVel.y;
        }
      }
	}
 
  //NS方程式による速度更新
  methodCIP(velX, velXgx, velXgy, velX, velY);
  methodCIP(velY, velYgx, velYgy, velX, velY);

  //Poisson方程式の右辺
  var D = [];
  for(i = 0; i <=NX; i++) D[i] = [];
	
  for (j = 1; j < NY; j++)
	for (i = 1; i < NX; i++)
	{
	  if(type[i][j] != "INSIDE") continue;//INSIDE以外の速度は初期設定値
	  a = (velX[i+1][j] - velX[i-1][j]) / DX;
	  b = (velY[i][j+1] - velY[i][j-1]) / DY;
	  D[i][j] = A3 * (a + b) / deltaT;
	}
  //Poissonの方程式を解く
  var cnt = 0;
  while (cnt < iteration)
  {
	maxError = 0.0;

	for (i = 0; i <= NX; i++)
	  for (j = 0; j <= NY; j++) 
	  {
		if(type[i][j] == "INSIDE") continue;
		else if(type[i][j] == "INLET")  Prs[i][j] = Prs[1][j];//Neumann(左端）
		else if(type[i][j] == "OUTLET") Prs[i][j] = 0;//Prs[NX-1][j];//0;//（右端）
		else if(type[i][j] == "TOP") Prs[i][j] = Prs[i][NY-1];
		else if(type[i][j] == "BOTTOM") Prs[i][j] = Prs[i][1];
		else if(type[i][j] == "OBS_LEFT") Prs[i][j] = Prs[i-1][j];
		else if(type[i][j] == "OBS_RIGHT") Prs[i][j] = Prs[i+1][j];
		else if(type[i][j] == "OBS_TOP") Prs[i][j] = Prs[i][j+1];
		else if(type[i][j] == "OBS_BOTTOM") Prs[i][j] = Prs[i][j-1];
		else if(type[i][j] == "OBS_UL") Prs[i][j] = Prs[i-1][j+1];
		else if(type[i][j] == "OBS_UR") Prs[i][j] = Prs[i+1][j+1];
		else if(type[i][j] == "OBS_LL") Prs[i][j] = Prs[i-1][j-1];
		else if(type[i][j] == "OBS_LR") Prs[i][j] = Prs[i+1][j-1];
	  }

	  //反復計算
      for (j = 1; j < NY; j++)
	    for (i = 1; i < NX; i++)
		{
	      if(type[i][j] != "INSIDE") continue;
		  pp = A1 * (Prs[i+1][j] + Prs[i-1][j]) + A2 * (Prs[i][j+1] + Prs[i][j-1]) - D[i][j];
		  error = Math.abs(pp -  Prs[i][j]);
		  if (error > maxError) maxError = error;
		  Prs[i][j] = pp;//更新 
		}
			
      if (maxError < tolerance) break;
  	  cnt++;
  }
  console.log("cnt= " + cnt + " error = " + error);

  //速度ベクトルの更新
  for (j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{	        
	  if(type[i][j] != "INSIDE") continue;
	  velX[i][j] += - 0.5 * deltaT * (Prs[i+1][j] - Prs[i-1][j]) / DX;
	  velY[i][j] += - 0.5 * deltaT * (Prs[i][j+1] - Prs[i][j-1]) / DY;

	}

  //渦度を速度から求める
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++) 
	{
	  Omg[i][j] = 0.5 * ((velY[i+1][j] - velY[i-1][j]) / DX - (velX[i][j+1] - velX[i][j-1]) / DY);
	}


  //流れ関数，渦度の最小値，最大値
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++)
	{
	  if(type[i][j] != "INSIDE") continue;
	  if(Prs[i][j] > maxPrs0) maxPrs0 = Prs[i][j];
	  if(Prs[i][j] < minPrs0) minPrs0 = Prs[i][j];
	  if(Omg[i][j] > maxOmg0) maxOmg0 = Omg[i][j];
	  if(Omg[i][j] < minOmg0) minOmg0 = Omg[i][j];
	}
console.log("maxPrs= " + maxPrs0 + " minPrs = " + minPrs0);
console.log("maxOmg= " + maxOmg0 + " minOmg = " + minOmg0);

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
	  if(type[i][j] != "INSIDE") continue;
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
	  if(type[i][j] != "INSIDE") continue;
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
    for(j = 0; j < NY; j++)
	{
      for(i = 0; i < NX; i++)
	  {//三角形セルに分割
        //1つでも内点なら描画
	    if( type[i][j] != "INSIDE" && type[i][j+1] != "INSIDE" 
	     && type[i+1][j+1] != "INSIDE" && type[i+1][j] != "INSIDE" ) continue;

	    p[0] = PP[i][j]; x[0] = i * DX;     y[0] = j * DY;
	    p[1] = PP[i][j+1]; x[1] = i * DX;     y[1] = (j+1) * DY;
	    p[2] = PP[i+1][j+1]; x[2] = (i+1) * DX; y[2] = (j+1) * DY;
	    p[3] = PP[i+1][j]; x[3] = (i+1) * DX; y[3] = j * DY;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -10.0; y1 = -10.0; 
					
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
			  data.push(rect.left0.x + scale.x * x1);
			  data.push(rect.left0.y + scale.y * y1);
			  data.push(rect.left0.x + scale.x * x2);
			  data.push(rect.left0.y + scale.y * y2);
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
			  data.push(rect.left0.x + scale.x * x1);
			  data.push(rect.left0.y + scale.y * y1);
			  data.push(rect.left0.x + scale.x * x2);
			  data.push(rect.left0.y + scale.y * y2);
	        }
          }
        }//m
	  }//j
	}//i  
  }//k
  drawLines(data, col);
}

function drawColormap(PP, minP, maxP, col)
{
  var range0 = maxP - minP;
  var x0, y0, x1, y1, x2, y2, x3, y3;
  var pp = [], rr = [], gg = [], bb = [];
  var i, j, k;
  var vertices = [];
  var colors = [];

  for (i = 0; i < NX; i++)
  {
    for (j = 0; j < NY; j++)
    {
	  x0 = rect.left0.x + scale.x * i * DX;     
      y0 = rect.left0.y + scale.y * j * DY;
	  x1 = rect.left0.x + scale.x * (i+1) * DX;
      y1 = rect.left0.y + scale.y * j * DY;
	  x2 = rect.left0.x + scale.x * (i+1) * DX; 
      y2 = rect.left0.y + scale.y * (j+1) * DY;
	  x3 = rect.left0.x + scale.x * i * DX;     
      y3 = rect.left0.y + scale.y * (j+1) * DY;

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
  for(i = 1; i < NX; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < NY; j++)
	{
	  if(j % intervalV != 0) continue;
	  if(type[i][j] == "OBSTACLE") continue;
	  if(type[i][j] == "OBS_LEFT") continue;	  
      if(type[i][j] == "OBS_RIGHT") continue;
	  if(type[i][j] == "OBS_TOP") continue;

	  mag = Math.sqrt(velX[i][j] * velX[i][j] + velY[i][j] * velY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(velY[i][j], velX[i][j]);
	  x0 = rect.left0.x + scale.x * i * DX;
      y0 = rect.left0.y + scale.y * j * DY;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  for(i = 1; i < NX; i++)
  {
    drawLine(rect.left0.x + scale.x * i * DX, rect.left0.y,
      rect.left0.x + scale.x * i * DX, rect.left0.y + scale.y * rect.size.y, 1, "black");
  }
  for(j = 1; j < NY; j++)
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * DY,
     rect.left0.x + scale.x * rect.size.x, rect.left0.y + scale.y * j * DY, 1, "black");
  }
}

//-----------------------------------------------------------------
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
var speedCoef = 1;
//var numMaxP;//最大個数
var typeP = 2;

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
  vel.x = (1.0 - b) * ((1.0 - a) * velX[I][J] + a * velX[I+1][J]) + b * ((1.0 - a) * velX[I][J+1] + a * velX[I+1][J+1]);
  vel.y = (1.0 - b) * ((1.0 - a) * velY[I][J] + a * velY[I+1][J]) + b * ((1.0 - a) * velY[I][J+1] + a * velY[I+1][J+1]);
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
  obsSpeed = parseFloat(form2.obs_speed.value);
  calcCourant();
  display();
}

function onClickObsStop()
{
  flagObsStop = !flagObsStop;
}

function onChangeMoveMode()
{
  var nn;
  var radioMM = document.getElementsByName("radioMM");
  for(var i = 0; i < radioMM.length; i++)
  {
     if(radioMM[i].checked) moveMode = i;
  }
  onClickReset();
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
  flagObsStop = false;
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



