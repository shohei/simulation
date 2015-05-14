/*-----------------------------------------------
     vortexWave2.js
     レギュラー格子による速度-圧力法（フラクショナル・ステップ法）
     移動障害物。
     渦と波が共存
     正の渦度を負に反転表示
------------------------------------------------*/
var canvas;//canvas要素
var gl;    //WebGL描画用コンテキスト
var camera;//カメラ
var light; //光源
var flagDebug = false;
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//表示オブジェクト
var w_object;//水面
var obstacle = [];//移動、固定障害物
var adjustH = 0.1;//表示上の高さ調整
var displayMode = 0;//渦度/流れ関数
var colorMode = 0;//連続／段階表示
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
var deltaT = 0.05;
var Re = 3000.0;//レイノルズ数

var maxDisp = 2.0;
//移動障害物
var speed = 1;//障害物速度
var obsRadius = 4;//円運動時の半径
var moveMode = 0;//直線
var flagObsStop = false;

//波
var NX = 100;
var NY = 100;
var DX, DY;
var sizeX = 10; //[m]
var sizeY = 10; //[m]
var period = 1; //[s]
var freq = 1;   //[Hz]
var lambda = 1; //[m]
var amp0 = 20;  //[m]
var waveVel = 1;//伝搬速度
var mu0 = 1.5;  //粘性抵抗
//波動による変位量計算
var vel = []; //z軸方向の速度
var pos = []; //変位量

//移動障害物
var obs_nWX =12;// 6;//障害物の厚さ(ｘ方向,格子間隔の整数倍)
var obs_nWY =12;// 6; //障害物の幅(ｙ方向,格子間隔の整数倍)

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
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.enable(gl.DEPTH_TEST);

  form2.deltaT.value = deltaT;
  form2.Re.value = Re;
  form2.nMesh.value = NX;
  form2.adjustH.value = adjustH;
  form2.maxDisp.value = maxDisp;
  form2.amp0.value = amp0;
  form2.waveVel.value = waveVel;
  form2.lambda.value = lambda;
  form2.mu0.value = mu0;
    
  
  initCamera();
  initData();
  display();
  
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
        
      renewObsPos(deltaT);
      //障害物の中心を波源位置にする
      var sourceI = Math.round(NY * (obstacle[0].vPos.x + sizeX/2.0) / sizeX);
      var sourceJ = Math.round(NY * (obstacle[0].vPos.y + sizeY/2.0) / sizeY);
      if(!flagObsStop) pos[sourceI][sourceJ] = amp0 * Math.sin(2.0 * Math.PI * freq * elapseTimeN);
       
      var nSkip = 10;
      var dt = deltaT / nSkip;
      for(var i = 0; i < nSkip; i++) 
      {
        calcVortex(dt);//渦度計算
		calcWave(dt);
      }

      
      display();
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      
      form1.e_time.value = elapseTime.toString();
      form1.n_time.value = elapseTimeN.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();

}

//--------------------------------------------
function initCamera()
{
　//光源インスタンスを作成
  light = new Light();
  light.pos = [-200.0, 0.0, 100.0, 1.0];
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
    
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.theta = 40; 
  camera.cnt[2] = 0.2;
  camera.dist = 15;
  camera.delta = 1;
  camera.getPos();//カメラ位置を計算
  mouseOperation(canvas, camera);//swgSupport.js
}

function initObject()
{
  waveVel = parseFloat(form2.waveVel.value);
  lambda = parseFloat(form2.lambda.value);
  period = lambda / waveVel;
  freq = 1 / period;
  amp0 = parseFloat(form2.amp0.value);
  mu0 = parseFloat(form2.mu0.value);

  deltaT = parseFloat(form2.deltaT.value);
  Re = parseFloat(form2.Re.value);
  NX = parseInt(form2.nMesh.value);
  NY = NX;

  DX = sizeX / NX;//格子間隔
  DY = sizeY / NY;
  //解析結果表示オブジェクト
  w_object = new Rigid();//Rigidクラスのオブジェクトを表示オブジェクト
  w_object.kind  = "ELEVATION";
  w_object.sizeX = sizeX;
  w_object.sizeY = sizeY;
  w_object.vSize = new Vector3(1, 1, adjustH);//scaling  
  w_object.nSlice = NX;
  w_object.nStack = NY;
  w_object.diffuse = [ 0.4, 0.6, 0.9, 1.0] ;
  w_object.ambient = [ 0.1, 0.2, 0.3, 1.0];
  w_object.specular = [ 0.8, 0.8, 0.8, 1.0];
  w_object.shininess = 100.0;
  w_object.flagDebug = flagDebug;
  //障害物
  for(var i = 0; i < 5; i++) {
    obstacle[i] = new Rigid();
    obstacle[i].kind = "CUBE";
  }
  obstacle[0].vSize = new Vector3(obs_nWX * DX, obs_nWX * DY, 0.5);
  obstacle[0].vPos = new Vector3(0, -4, 0);
  obstacle[0].vVel = new Vector3(0, speed, 0);  
  obstacle[0].flagDebug = flagDebug;
  speed = parseFloat(form2.obs_speed.value);
  //固定障害物（境界）
  var w = 0.1;//固定障害物の幅
  obstacle[1].vPos = new Vector3(0,-sizeY/2 - w, 0);
  obstacle[1].vSize = new Vector3(sizeX, w, 0.5);
  obstacle[2].vPos = new Vector3(0, sizeY/2 - w, 0);
  obstacle[2].vSize = new Vector3(sizeX, w, 0.5);
  obstacle[3].vPos = new Vector3(-sizeX/2, - w, 0);
  obstacle[3].vSize = new Vector3( w, sizeY,0.5);
  obstacle[4].vPos = new Vector3( sizeX/2, - w, 0);
  obstacle[4].vSize = new Vector3( w, sizeY,0.5);
}

function initData()
{
  initObject();

  //障害物の左端・右端・上端・下端の格子単位の位置
  nX1 = Math.round(NX/2 + obstacle[0].vPos.x/DX - obs_nWX/2);//障害物左端
  nX2 = Math.round(NX/2 + obstacle[0].vPos.x/DX + obs_nWX/2);//障害物右端
  nY2 = Math.round(NY/2 + obstacle[0].vPos.y/DY + obs_nWY/2);//障害物上端
  nY1 = Math.round(NY/2 + obstacle[0].vPos.y/DY - obs_nWY/2);//障害物下端

  var i, j;

  for(i = 0; i <= NX; i++)
  {
    type[i] = [];//格子点のタイプ
    Prs[i] = []; //圧力
    Omg[i] = []; //渦度
    velX[i] = []; //表示用も同じ
    velY[i] = [];
    velXgx[i] = [];//ｘ方向微分
    velXgy[i] = [];//ｙ方向微分
    velYgx[i] = [];//ｘ方向微分
    velYgy[i] = [];//ｙ方向微分
    //波動用
    vel[i] = [];
    pos[i] = [];
  }  

  //格子点のタイプ
  for(j = 0; j <= NY; j++)
  {
	for(i = 0; i <= NX; i++)
    {
	  type[i][j] = "INSIDE";//内点
	  if(j == 0) type[i][j] = "BOTTOM";//下側壁面
	  if(j == NY) type[i][j] = "TOP";//上側壁面
	  if(i == 0) type[i][j] = "INLET";//左側壁面
	  if(i == NX) type[i][j] = "OUTLET";//右側壁面
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
  //左端／右端もは流速0
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
      //波動計算用の格子点速度・位置
      vel[i][j] = 0.0;//変位のｚ軸方向速度
	  pos[i][j] = 0.0;//変位
    }  
}

function renewObsPos(dt)
{
  if(moveMode == 0)//直線モード
  { 
    obstacle[0].vVel.x = 0;
    if(obstacle[0].vVel.y > 0) obstacle[0].vVel.y = speed;
    else                    obstacle[0].vVel.y = -speed;
    if(obstacle[0].vPos.y >=  4) obstacle[0].vVel.y = -speed;
    if(obstacle[0].vPos.y <= -4) obstacle[0].vVel.y =  speed;
    if(!flagObsStop)obstacle[0].vPos.add(mul(obstacle[0].vVel, dt));
  }
  else//円運動
  {//初期位置は左側
    var xx = -obstacle[0].vPos.x;//中心からの距離（左側で正）
    var yy =  obstacle[0].vPos.y;//中心からの距離（上側で正）
    obstacle[0].vVel.x = speed * yy / obsRadius;
    obstacle[0].vVel.y = speed * xx / obsRadius;
    if(!flagObsStop){
      obstacle[0].vPos.x = -obsRadius * Math.sin(speed * elapseTimeN / obsRadius);
      obstacle[0].vPos.y = -obsRadius * Math.cos(speed * elapseTimeN / obsRadius);
    }
  }
  
  nX1 = Math.round(NX/2 + obstacle[0].vPos.x/DX - obs_nWX/2);//障害物左端位置
  nX2 = Math.round(NX/2 + obstacle[0].vPos.x/DX + obs_nWX/2);//障害物右端位置
  nY2 = Math.round(NY/2 + obstacle[0].vPos.y/DY + obs_nWY/2);//障害物上端位置
  nY1 = Math.round(NY/2 + obstacle[0].vPos.y/DY - obs_nWY/2);//障害物下端位置

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
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  var colorLoc = gl.getUniformLocation(gl.program, 'u_colorMode');
  gl.uniform1i(colorLoc, colorMode);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var i, j, k;
  var rangeDisp = maxDisp * 2;

  for(j = 0; j <= NY; j++)
    for(i = 0; i <= NX; i++)
    {
      k = i + j * (NX+ 1);
      
      var omega = Omg[i][j];
      if(omega > 0) omega = -omega;//正を負に反転
      var zz = omega + pos[i][j];
    
      //障害物の上部に変位を表示させないように
      if((i-NX/2)*DX > obstacle[0].vPos.x - obstacle[0].vSize.x/2 &&
         (i-NX/2)*DX < obstacle[0].vPos.x + obstacle[0].vSize.x/2 &&
         (j-NY/2)*DY > obstacle[0].vPos.y - obstacle[0].vSize.y/2 &&
         (j-NY/2)*DY < obstacle[0].vPos.y + obstacle[0].vSize.y/2 ) zz = 0;//continue;  

      w_object.data[k] = (zz + maxDisp) / rangeDisp;
    }
  w_object.vSize = new Vector3(1, 1, adjustH);
  var n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);

  //障害物
  gl.uniform1i(colorLoc, 2);
  for(i = 0; i < 5; i++)
  {
    n = obstacle[i].initVertexBuffers(gl);
    obstacle[i].draw(gl, n);
  }
}

function calcVortex(dt)
{
  var i, j;
  var iteration = 1;//最大繰り返し回数(Poisson方程式）
  var tolerance = 0.0001;//許容誤差
  var error = 0.0;
  var maxError = 0.0;
  var pp;
  var DX2 = DX * DX;
  var DY2 = DY * DY;
  var A1 = 0.5 * DY2 / (DX2 + DY2);
  var A2 = 0.5 * DX2 / (DX2 + DY2);
  var A3 = 0.25 * DX2*DY2 / (DX2 + DY2);
  var a, b, pp;
  
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
	      velX[i][j] = obstacle[0].vVel.x;
	      velY[i][j] = obstacle[0].vVel.y;
        }
      }
	}
	
  //NS方程式による速度更新
  methodCIP(velX, velXgx, velXgy, velX, velY, dt);
  methodCIP(velY, velYgx, velYgy, velX, velY, dt);

  //Poisson方程式の右辺
  var D = [];
  for(i = 0; i <= NX; i++) D[i] = [];
	
  for (j = 1; j < NY; j++)
	for (i = 1; i < NX; i++)
	{
	  if(type[i][j] != "INSIDE") continue;//INSIDE以外の速度は初期設定値
	  a = (velX[i+1][j] - velX[i-1][j]) / DX;
	  b = (velY[i][j+1] - velY[i][j-1]) / DY;
	  D[i][j] = A3 * (a + b) / dt;
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
		else if(type[i][j] == "OUTLET") Prs[i][j] = 0;//（右端）
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

  //速度ベクトルの更新
  for (j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{	        
	  if(type[i][j] != "INSIDE") continue;
	  velX[i][j] += - 0.5 * dt * (Prs[i+1][j] - Prs[i-1][j]) / DX;
	  velY[i][j] += - 0.5 * dt * (Prs[i][j+1] - Prs[i][j-1]) / DY;

	}


  //渦度を速度から求める
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++) 
	{
	  Omg[i][j] = 0.5 * ((velY[i+1][j] - velY[i-1][j]) / DX - (velX[i][j+1] - velX[i][j-1]) / DY);
	}

  

}
//------------------------------------------------------------------------
function methodCIP(f, gx, gy, vx, vy, dt)
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

	  x = - vx[i][j] * dt;
	  y = - vy[i][j] * dt;
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
	  newF[i][j] += dt * ( (f[i-1][j] + f[i+1][j] - 2.0 * f[i][j]) / dx2 
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
//----------------------------------------------------------------
function calcWave(dt)
{  
  //波動方程式                      
  var i, j;
  var D = sizeX / NX;//格子間隔(sizeX0=sizeY0,NX0=NY0であること）
  var D2 = D * D;
  var cc = waveVel * waveVel / D2;

  //格子点のｚ方向速度と位置の更新(Euler法)
  
  for(j = 0; j <= NY; j++)
    for(i = 0; i <= NX; i++)
    {
      //解析領域境界は常に自由境界
      {
        if(i == 0)  pos[0][j] = -pos[1][j] ;
        if(i == NX) pos[NX][j] = -pos[NX-1][j] ; 
        if(j == 0)  pos[i][0] = -pos[i][1] ;
        if(j == NY) pos[i][NY] = -pos[i][NY-1] ;
	  }
	  if(i == 0 || i == NX || j == 0 || j == NY) continue;
      
	  var accel = cc * (pos[i-1][j] + pos[i+1][j] + pos[i][j-1] + pos[i][j+1] - 4 * pos[i][j]);
	  accel -= mu0 * vel[i][j];
      //速度
      vel[i][j] += accel * dt;
      //位置
      pos[i][j] += vel[i][j] * dt;
    }

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

function onChangeData2()
{
  adjustH = parseFloat(form2.adjustH.value);
  if(adjustH == 0) adjustH = 0.001;//　完全に0にするとmatrix4の逆行列ルーチンでエラーになる
  maxDisp = parseFloat(form2.maxDisp.value);
  amp0 = parseFloat(form2.amp0.value);
  mu0 = parseFloat(form2.mu0.value);
  speed = parseFloat(form2.obs_speed.value);
  display();
}

function onChangeDisplayMode()
{
  var nn;
  var radioD = document.getElementsByName("radioD");
  for(var i = 0; i < radioD.length; i++)
  {
     if(radioD[i].checked) displayMode = i;
  }
  display();
}

function onChangeColorMode()
{
  var nn;
  var radioC = document.getElementsByName("radioC");
  for(var i = 0; i < radioC.length; i++)
  {
     if(radioC[i].checked) colorMode = i;
  }
  display();
}

function onClickDebug()
{
  w_object.flagDebug = obstacle[0].flagDebug = flagDebug = !flagDebug ;
  display(); 
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

function onClickCameraReset()
{
  initCamera();
  display();
}

function onClickCameraAbove()
{
  initCamera();
  camera.theta = 90.01;
  camera.getPos();//カメラ位置を計算
  display();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}



