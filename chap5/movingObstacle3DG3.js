/*-----------------------------------------------
     movingObstacle3DG3.js
     レギュラー格子による速度-圧力法（フラクショナル・ステップ法）
     マウス操作による移動障害物。
     テクスチャマッピング
     3Dグラフィックス     
------------------------------------------------*/
var canvas;//canvas要素
var gl;    //WebGL描画用コンテキスト
var camera;//カメラ
var light; //光源
var flagDebug = false;
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0;//全経過時間
var elapseTime0 = 0;
var elapseTime1 = 0;
var elapseTimeN = 0;
var elapseTimeN0 = 0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//表示オブジェクト
var object, obstacle;
var flagObstacleShow = true;
var texNo = 0;
var adjustH = 0.01;//表示上の高さ調整
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
var g_posX = [];//格子点座標
var g_posY = [];
var deltaT = 0.005;
var Re = 3000.0;//レイノルズ数

var maxPrs = 1.0;
var minPrs = -1.0;
var maxOmg = 10.0;
var minOmg = -10.0;

//移動障害物,格子
var obsPos = new Vector3(0.2, 0.5, 0);//ダクト左下を原点とした位置(仮の値）
var obsPos0 = new Vector3(0.2, 0.5, 0);//更新前の値(仮の値）
var speed = new Vector3();

var gridMoveMode = 0;//格子の移動モード
//解析領域矩形構造体
function Rect()
{
  this.nMeshX = 100;//x方向割数（固定）
  this.nMeshY = 100; //y方向分割数（固定）
  this.size = new Vector3(1, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.delta = new Vector3(); //格子間隔
  this.obs_nX0 = 15;  //左端から障害物中心までの距離(格子間隔の整数倍）
  this.obs_nY0 = 15;  //下端端から障害物中心までの距離(格子間隔の整数倍）
  this.obs_nWX = 6;//障害物の厚さ(ｘ方向,格子間隔の整数倍)
  this.obs_nWY = 6; //障害物の幅(ｙ方向,格子間隔の整数倍)
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
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.enable(gl.DEPTH_TEST);

  form1.deltaT.value = deltaT;
  form1.Re.value = Re;
  form1.nMeshX.value = rect.nMeshX;
  form1.nMeshY.value = rect.nMeshY;
  form1.obs_nWX.value = rect.obs_nWX;
  form1.obs_nWY.value = rect.obs_nWY;
  form2.adjustH.value = adjustH;
  form2.maxPrs.value = maxPrs;
  form2.minPrs.value = minPrs;
  form2.maxOmg.value = maxOmg;
  form2.minOmg.value = minOmg;
  
  initCamera();
  initData();

  readyTexture();
/* 
  m_flagObstacle = true;
  form2.radioMouse.value = 1;
  mouseOperation(canvas, camera);
*/
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
        
      renewObsPos();
      calculate(); 
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

//------------------------------------------------------------------------
function readyTexture() 
{
  var tex = gl.createTexture();// テクスチャオブジェクトを作成する

  var image = new Image();
  if(texNo == 0) image.src = '../image/check1.jpg';
  else if(texNo == 1) image.src = '../image/check3.jpg'; 
  else if(texNo == 2) image.src = '../image/tiger.jpg';
  else if(texNo == 3) image.src = '../image/dog2.jpg';
  else if(texNo == 4) image.src = '../image/char2.jpg';

  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(); }

  function setTexture() 
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    gl.activeTexture(gl.TEXTURE0);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    //シェーダのユニフォーム変数u_samplerにユニット0を渡す
    var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
    gl.uniform1i(samplerLoc, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);    
    display();
  }
}

//--------------------------------------------
function initCamera()
{
　//光源インスタンスを作成
  light = new Light();
  light.pos = [50.0, -100.0, 100.0, 1.0];
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
    
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.phi = 0; 
  camera.theta = 90.01;
  camera.dist = 3.8;
  camera.fovy = 15;
  camera.getPos();//カメラ位置を計算

  mouseOperation(canvas, camera);//swgSupport2.js
}

function initData()
{
  deltaT = parseFloat(form1.deltaT.value);
  Re = parseFloat(form1.Re.value);
  NX = parseInt(form1.nMeshX.value);
  NY = parseInt(form1.nMeshY.value);
  obsPos.x = rect.size.x / 5;
  obsPos.y = rect.size.y / 5;
  rect.obs_nWX = parseFloat(form1.obs_nWX.value);
  rect.obs_nWY = parseFloat(form1.obs_nWY.value);

  DX = rect.size.x / NX;//格子間隔
  DY = rect.size.y / NY;
  //障害物の左端・右端・上端・下端の格子単位の位置
  nX1 = Math.round(obsPos.x/DX - rect.obs_nWX/2);//障害物左端
  nX2 = Math.round(obsPos.x/DX + rect.obs_nWX/2);//障害物右端
  nY2 = Math.round(obsPos.y/DY + rect.obs_nWY/2);//障害物上端
  nY1 = Math.round(obsPos.y/DY - rect.obs_nWY/2);//障害物下端

  var i, j;
//console.log(" nX1 = " + nX1 + " nY1 = " + nY1 + " nX2 = " + nX2 + " nY2 = " + nY2);
  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    type[i] = [];//格子点のタイプ
    Prs[i] = []; //圧力
    Omg[i] = []; //渦度
    velX[i] = []; //表示用も同じ
    velY[i] = [];
    velXgx[i] = [];//ｘ方向微分
    velXgy[i] = [];//ｙ方向微分
    velYgx[i] = [];//ｘ方向微分
    velYgy[i] = [];//ｙ方向微分
    g_posX[i] = [];//格子点座標
    g_posY[i] = [];//格子点座標
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
  //入口/出口は流速1
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
	  //格子点座標初期値
	  g_posX[i][j] = i * DX - rect.size.x / 2;
	  g_posY[i][j] = j * DY - rect.size.y / 2;
    }

  maxPrs0 = -1000.0; minPrs0 = 1000.0;
  maxOmg0 = -1000.0; minOmg0 = 1000.0;
  
  initObject();
}

function initObject()
{
  //解析結果表示オブジェクト
  object = new Rigid();//Rigidクラスのオブジェクトを表示オブジェクト
  object.kind  = "GRID_SQUARE";//"ELEVATION";//
  object.sizeX = rect.size.x;
  object.sizeY = rect.size.y;
  object.vSize = new Vector3(1, 1, adjustH);//scaling  
  object.nSlice = NX;
  object.nStack = NY;
  //object.nRepeatS = 2;
  //object.nRepeatT = 2;
  object.flagTexture = form2.tex.checked;//false;
  //障害物
  obstacle = new Rigid();
  obstacle.kind = "CUBE";
  obstacle.diffuse = [ 0.8, 0.8, 0.0, 1.0] ;
  obstacle.ambient = [ 0.5, 0.5, 0.0, 1.0];
  obstacle.specular = [ 0.8, 0.8, 0.8, 1.0];
  obstacle.shininess = 100.0;
  obstacle.vSize = new Vector3(rect.obs_nWX * DX, rect.obs_nWY * DY, 0.1);
  obstacle.vPos = new Vector3(rect.obs_nX0 * DX - rect.size.x/2, rect.obs_nY0 * DY - rect.size.y/2, 0);
  obstacle.flagDebug = flagDebug;
  obstacle.flagTexture = false;

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

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var i, j, k, xx, yy, zz;
  var range0;
  maxPrs = parseFloat(form2.maxPrs.value);
  minPrs = parseFloat(form2.minPrs.value);
  maxOmg = parseFloat(form2.maxOmg.value);
  minOmg = parseFloat(form2.minOmg.value);

  object.data = [];
  for(j = 0; j <= NY; j++)
    for(i = 0; i <= NX; i++)
    {
      k = i + j * (NX+ 1);
      if(gridMoveMode == 0)//格子点移動なし
      {
        xx = i * DX - rect.size.x / 2;
        yy = j * DY - rect.size.y / 2;
      }
      else if(gridMoveMode == 1)//障害物が遠くなれば元に戻る
      {
        xx = i * DX - rect.size.x / 2 + velX[i][j] * deltaT * 20;
        yy = j * DY - rect.size.y / 2 + velY[i][j] * deltaT * 20;
      }
      else if(gridMoveMode == 2)
      {
        g_posX[i][j] += velX[i][j] * deltaT * 0.1;
        g_posY[i][j] += velY[i][j] * deltaT * 0.1;
        
        //領域の境界は固定
        if(g_posX[i][j] < -rect.size.x/2) g_posX[i][j] = -rect.size.x/2;
        if(g_posX[i][j] >  rect.size.x/2) g_posX[i][j] =  rect.size.x/2;        
        if(g_posY[i][j] < -rect.size.y/2) g_posX[i][j] = -rect.size.y/2;
        if(g_posY[i][j] >  rect.size.y/2) g_posX[i][j] =  rect.size.y/2;
        xx = g_posX[i][j]; yy = g_posY[i][j];
      }
      
      if( displayMode == 0 ) //渦度
      {
        range0 = maxOmg - minOmg;
        zz = (Omg[i][j] - minOmg) / range0;
      }
      else  
      {
        range0 = maxPrs - minPrs;
        zz = (Prs[i][j] - minPrs) / range0;
      }
      object.data.push([xx, yy, zz]);

    }

  object.vSize = new Vector3(1, 1, adjustH);
  object.vPos.z = -adjustH * 0.5;//中間色(G)をz=0の位置にする
  var n = object.initVertexBuffers(gl);
  object.draw(gl, n);

  //障害物
  if(flagObstacleShow)
  {  
    n = obstacle.initVertexBuffers(gl);
    obstacle.draw(gl, n);
  }
}

function renewObsPos()
{
  //obstacle.vPosはswgSupport2.jsで求めている
  //それを計算領域(rect)の左下を原点とした座標系に変換
  obsPos.x = obstacle.vPos.x + rect.size.x/2;
  obsPos.y = obstacle.vPos.y + rect.size.y/2;
  //deltaT館に移動した距離から障害物の速度を求める（そのまま求めると大きくなりすぎるので0.1～0.2程度を乗じる）
  speed.x = (obsPos.x - obsPos0.x) / deltaT * 0.2 ;
  speed.y = (obsPos.y - obsPos0.y) / deltaT * 0.2;
  var maxSpeed = 0.8;//クーラン数が大きくならないように最大値を制限
  if(speed.x >  maxSpeed) speed.x = maxSpeed;
  if(speed.x < -maxSpeed) speed.x = -maxSpeed;
  if(speed.y >  maxSpeed) speed.y = maxSpeed;
  if(speed.y < -maxSpeed) speed.y = -maxSpeed;
console.log("speed.x=" + speed.x + " speed.y = " + speed.y);

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
	obsPos0.copy(obsPos);
}

function calculate()
{
  var i, j;
  var iteration = 1;//最大繰り返し回数(Poisson方程式）
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
  
  //障害物
  for (j = 1; j < NY; j++) 
    for (i = 1; i < NX; i++)
	{
	  if(type[i][j] == "INSIDE") continue;
	  {
	    velX[i][j] = speed.x;
	    velY[i][j] = speed.y;
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
		else if(type[i][j] == "INLET")  Prs[i][j] = Prs[1][j];//Neumann(流入口）
		else if(type[i][j] == "OUTLET") Prs[i][j] = 0;//（流出口）
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
//  console.log("cnt= " + cnt + " error = " + error);

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
//console.log("maxPrs= " + maxPrs0 + " minPrs = " + minPrs0);
//console.log("maxOmg= " + maxOmg0 + " minOmg = " + minOmg0);

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

function onChangeAdjustH()
{
  adjustH = parseFloat(form2.adjustH.value);
  if(adjustH == 0) adjustH = 0.001;//　完全に0にするとmatrix4の逆行列ルーチンでエラーになる
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

function onClickTex()
{
  if(form2.tex.checked) object.flagTexture = true;
  else object.flagTexture = false;
  display(); 
}

function onChangeTexNo()
{
  texNo = form2.texNo.value;
  readyTexture();
  display(); 
}

function onClickMouse()
{
  var nn;
  var radioMouse = document.getElementsByName("radioMouse");
  for(var i = 0; i < radioMouse.length; i++)
  {
     if(radioMouse[i].checked) nn = i;
  }
  if(nn == 0) m_flagObstacle = false;
  else 
  { m_flagObstacle = true; 
    //m_rigid = obstacle; 
  }
  mouseOperation(canvas, camera);
}

function onChangeGridMoveMode()
{
  var nn;
  var radioGM = document.getElementsByName("radioGM");
  for(var i = 0; i < radioGM.length; i++)
  {
     if(radioGM[i].checked) gridMoveMode = i;
  }
  display();
}

function onClickDebug()
{
  object.flagDebug = obstacle.flagDebug = flagDebug = !flagDebug ;
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
  lastTime = new Date().getTime();
  m_flagObstacle = true;
  form2.radioMouse.value = 1;
  mouseOperation(canvas, camera);

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


function onClickObstacle()
{
  flagObstacleShow = !flagObstacleShow;
  display();
}

function onClickCameraReset()
{
  initCamera();
  camera.theta = 10.0;
  camera.getPos();//カメラ位置を計算
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



