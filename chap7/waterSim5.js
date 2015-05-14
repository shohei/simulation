/*-----------------------------------------------
     waterSim5.js
     波動シミュレーションのみ
     コースティックス
     水面の透明化+屈折効果
     水面をクリックすると単一波が発生
------------------------------------------------*/
var canvas;//canvas要素
var gl;    //WebGL描画用コンテキスト
var camera;//カメラ
var light; //光源
var flagDebug = false;
//animation
var fps = 0.0; //フレームレート
var lastTime = 0.0;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var elapseTimeN = 0.0;
var flagStart = true;//false;
var flagStep = false;
var flagReset = false;
var deltaT = 0.025;
//表示オブジェクト
var w_object;//水面
var obstacle;//移動障害物
var floor0;  //水槽の底
var wall = [];//水槽の壁面
//水面オブジェクト
var NX = 63;
var NY = 63;
var DX, DY;
var sizeX = 10; //[m]
var sizeY = 10; //[m]
//波動パラメータ
var period = 1;//[s]
var freq = 1;  //[Hz]
var lambda = 1;//[m]
var amp0 = 1;   //[m]
var waveVel = 1;//伝搬速度
var mu0 = 0.8;    //粘性抵抗
var adjustC = 1.0;//集光模様の強さ調整
var mode = "CONTINUOUS";//連続
//波動による変位量計算
var vel = []; //z軸方向の速度
var pos = []; //変位量

var sourceI, sourceJ;//波源格子点(移動障害物の中心点）
//集光模様
var caus;//データ
var fovy_proj = 12;
var texWidth = 64;
var texHeight = 64;
var flagCaustics = false;
//その他
var plane ;//影の対象平面の方程式（a,b,c,d)
var heightW = 4;//フロア(水槽の底）から水面までの高さ
var shadow_value = 0.2;//影
var transparency = 0.85;//透明度
//屈折効果
var index = 1.33;//屈折率
var stencil;     //ステンシルオブジェクト

var fish0, fish1, fish2;
var vSource;// = new Vector3();//マウスでクリックされた水面位置（swgSupportW.jsのmouseOperation())
//ダミー
var dummy = new Rigid();

function webMain() 
{
  //canvas要素を取得する
  canvas = document.getElementById('WebGL');
  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas, {stencil: true});//stencil bufferを使えるようにする
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
  gl.enable(gl.STENCIL_TEST);

  form2.deltaT.value = deltaT;
  form2.adjustC.value = adjustC;
  form2.amp0.value = amp0;
  form2.waveVel.value = waveVel;
//  form2.speed.value = speed;
  form2.lambda.value = lambda;
  form2.mu0.value = mu0;
  form2.shadow.value = shadow_value;
  form2.transparency.value = transparency;
    
  initCamera();
  initData();
  setCausTexture();
  onClickStart();
  display();
  
  var timestep = 0;
  var time = 0;
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

      //障害物の中心を波源位置にする
      if(vSource.x > -sizeX/2 && vSource.x < sizeX/2 &&  vSource.y > -sizeY/2 && vSource.y < sizeY/2)
      { 
        time += deltaT;
        var sourceI = Math.round(NX * (vSource.x + sizeX/2.0) / sizeX);
        var sourceJ = Math.round(NY * (vSource.y + sizeY/2.0) / sizeY);
        if(mode == "SINGLE")
        {
        if(time < period)
		  vel[sourceI][sourceJ] = amp0 * Math.sin(2.0 * Math.PI * freq * time);  
        else{
          time = 0;
          vSource.x = 1000; vSource.y = 1000;
        }
        }
        else
        {
		  vel[sourceI][sourceJ] = amp0 * Math.sin(2.0 * Math.PI * freq * time);  
        }    
      }
       
      var nSkip = 10;
      var dt = deltaT / nSkip;
      for(var i = 0; i < nSkip; i++) calcDisp(dt);
      
      fish0.motion(elapseTimeN);
      fish1.motion(elapseTimeN);
      fish2.motion(elapseTimeN);
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
  light.pos = [0.0, 0.0, 10.0, 1.0];
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
    
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.theta = 30; 
  camera.cnt[2] = -1.5;
  camera.dist = 35;
  camera.delta = 1;
  camera.fovy = 20;
  camera.getPos();//カメラ位置を計算
  mouseOperation(canvas, camera);//swgSupportW.js
}

function initObject()
{
  waveVel = parseFloat(form2.waveVel.value);
  lambda = parseFloat(form2.lambda.value);
  period = lambda / waveVel;
  freq = 1 / period;
  amp0 = parseFloat(form2.amp0.value);
  mu0 = parseFloat(form2.mu0.value);
//  speed = parseFloat(form2.speed.value);

  deltaT = parseFloat(form2.deltaT.value);
  sourceI = NX / 2;
  sourceJ = NY / 2;

  DX = sizeX / NX;//格子間隔
  DY = sizeY / NY;
  //解析結果表示オブジェクト
  w_object = new Rigid();//Rigidクラスのオブジェクトを表示オブジェクト
  w_object.kind  = "ELEVATION";
  w_object.sizeX = sizeX;
  w_object.sizeY = sizeY;
  //w_object.vSize = new Vector3(1, 1, adjustC);//scaling  
  w_object.nSlice = NX;
  w_object.nStack = NY;
  w_object.diffuse = [ 0.0, 0., 0.2, 1.0] ;
  w_object.ambient = [ 0.0, 0.2, 0.9, 1.0];
  w_object.specular = [ 1, 1, 1, 0.2];
  w_object.shininess = 200.0;
  w_object.flagDebug = flagDebug;

  //水槽の壁面
  var WN1 = 10;
  var WN2 = 5;
  for(var i = 0; i < 4; i++) 
  {
    wall[i] = new Rigid();
    wall[i].kind = "CHECK_PLATE";
    wall[i].flagCheck = true;  
    if(i == 0 || i == 1)
    {
      wall[i].nSlice = WN1;//x方向分割数
      wall[i].nStack = WN2;//y方向分割数
    }
    else
    {
      wall[i].nSlice = WN2;//x方向分割数
      wall[i].nStack = WN1;//y方向分割数
    }
    wall[i].col1 = [0.6, 0.5, 0.5, 1.0];
    wall[i].col2 = [0.4, 0.4, 0.55, 1.0];
  }
  var h = heightW + 0.8;//壁面全体の高さ(heightWは水面以下の高さ)
  //左端
  wall[0].vPos = new Vector3(0, -sizeY/2-0.01, h/2 - heightW);
  wall[0].vSize = new Vector3(sizeX+0.2, h, 1);
  wall[0].vEuler = new Vector3(-90, 0, 0);
  wall[0].plane = [0.0, 1.0, 0.0, sizeY/2];//平面方程式のa,b,c,d
  //右端
  wall[1].vPos = new Vector3(0, sizeY/2+0.01, h/2 - heightW);
  wall[1].vSize = new Vector3(sizeX+0.2, h, 1);
  wall[1].vEuler = new Vector3(90, 0, 0);
  wall[1].plane = [0.0, -1.0, 0.0, sizeY/2];
  //奥
  wall[2].vPos = new Vector3(-sizeX/2-0.01, 0, h/2 - heightW);
  wall[2].vSize = new Vector3( h, sizeY+0.2, 1);
  wall[2].vEuler = new Vector3(0, 90, 0);
  wall[2].plane = [1.0, 0.0, 0.0, sizeX/2];
  //手前
  wall[3].vPos = new Vector3( sizeX/2+0.01, -0, h/2 - heightW);
  wall[3].vSize = new Vector3( h, sizeY+0.2, 1);
  wall[3].vEuler = new Vector3(0, -90, 0);
  wall[3].plane = [-1.0, 0.0, 0.0, sizeX/2];

  //フロアの初期設定
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.plane = [0.0, 0.0, 1.0, heightW];
  floor0.vPos = new Vector3(0.0, 0.0, -heightW-0.01);//水面の高さは0
  floor0.vSize = new Vector3(sizeX, sizeY, 1);
  floor0.nSlice = WN1;//x方向分割数
  floor0.nStack = WN1;//y方向分割数
  floor0.col1 = [0.6, 0.5, 0.5, 1.0];
  floor0.col2 = [0.4, 0.4, 0.55, 1.0];
  floor0.specular = [0.1, 0.1, 0.1, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
  //ステンシル
  stencil = new Rigid();
  stencil.kind = "PLATE_Z";
  stencil.vSize = new Vector3(sizeX, sizeY, 1);

  //fish0の初期値
  fish0 = new Fish0();
  fish0.vSize = new Vector3(2.0, 2.0, 2.0);
  fish0.vEuler = new Vector3(90.0, fish0.angleZ, 0.0);
  fish0.vPos0 = new Vector3(-fish0.radius, 0.0, -2.2);
  fish0.vPos = new Vector3(-fish0.radius, 0.0, -2.2);
  //fish1の初期値
  fish1 = new Fish1();
  fish1.vSize = new Vector3(2.0, 2.0, 2.0);
  fish1.vEuler = new Vector3(90.0, fish1.angleZ, 90.0);
  fish1.vPos0 = new Vector3(0.0, -fish1.radius, -3.5);
  fish1.vPos = new Vector3(0.0, -fish1.radius, -3.5);
  //fish1の初期値
  fish2 = new Fish2();
  fish2.vSize = new Vector3(2.0, 2.0, 2.0);
  fish2.vEuler = new Vector3(90.0, fish2.angleZ, -90.0);
  fish2.vPos0 = new Vector3(0.0, fish2.radius, -1.0);
  fish2.vPos = new Vector3(0.0, fish2.radius, -1.0);

  //円形波の波源位置
  vSource = new Vector3(0, 0, 0);
  //ダミー
  dummy.kind = "CHECK_PLATE";
  dummy.nSlice = NX;
  dummy.nStack = NY;
  dummy.flagCheck = true;
}

function initData()
{
  initObject();
  var i, j;

  for(i = 0; i <= NX; i++)
  {
    //配列の2次元化
    vel[i] = [];
    pos[i] = [];
  }  

  //初期値
  for(j = 0; j <= NY; j++)  
	for (i = 0; i <= NX; i++)
	{
      //波動計算用の格子点速度・位置
      vel[i][j] = 0.0;//変位のｚ軸方向速度
	  pos[i][j] = 0.0;//変位
    }  
    
  //集合模様データ
  caus = new Uint8Array(texWidth*texHeight);
}

function display()
{
  //水面の変位データ
  var i, j, k;
  for(j = 0; j <= NY; j++)
    for(i = 0; i <= NX; i++)
    {
      k = i + j * (NX+ 1);
      w_object.data[k] = pos[i][j] ;
      //変位データを集合模様データに変換
      caus[k] = 128 + w_object.data[k] * 10 ;
    }
  //テクスチャを設定
  setCausTexture();
  //テクスチャを投影
  projectTexture();
  
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

  var indexLoc = gl.getUniformLocation(gl.program, 'u_index');
  gl.uniform1f(indexLoc, index);
  var adjustLoc = gl.getUniformLocation(gl.program, 'u_adjustC');
  gl.uniform1f(adjustLoc, adjustC);

  // カラーバッファ,デプスバッファ,ステンシルバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.bindTexture(gl.TEXTURE_2D, texObj);

  gl.colorMask(false, false, false, false);
  gl.depthMask(false);
  //ステンシルバッファに値を書き込む
  gl.clearStencil(0);
  gl.stencilFunc(gl.ALWAYS, 1, ~0);
  gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
  var n = stencil.initVertexBuffers(gl);//水面と同じサイズの平面
  stencil.draw(gl, n);
  
  //ステンシルを有効にして屈折を考慮した結果をレンダリング
  gl.stencilFunc(gl.EQUAL, 1, ~0);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  var stencilLoc = gl.getUniformLocation(gl.program, 'u_flagStencil');
  gl.uniform1f(stencilLoc, true);

  gl.colorMask(true, true, true, true);
  gl.depthMask(true);
  
  //不透明物体を先に描画
  var causLoc = gl.getUniformLocation(gl.program, 'u_flagCaustics');
  gl.uniform1i(causLoc, true);

  var n = dummy.initVertexBuffers(gl);//ダミー
  fish0.draw(gl);
  fish1.draw(gl);
  fish2.draw(gl);
  //水槽の底と壁面
  drawTiles();
  gl.uniform1i(causLoc, false);

  //影の表示
  drawShadow();

  //透明物体(水面）
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  w_object.diffuse[3] = 1 - transparency;
  w_object.ambient[3] = 1 - transparency;
  w_object.vSize = new Vector3(1, 1, 1);
  n = dummy.initVertexBuffers(gl);//ダミー
  n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);
  gl.disable(gl.BLEND);
  gl.depthMask(true);

  //ステンシルを無効に
  gl.stencilFunc(gl.NOTEQUAL, 1, ~0);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.uniform1f(stencilLoc, false);
  //そしてもう一度描く
  var causLoc = gl.getUniformLocation(gl.program, 'u_flagCaustics');
  gl.uniform1i(causLoc, true);

  n = dummy.initVertexBuffers(gl);//ダミー
  fish0.draw(gl);
  fish1.draw(gl);
  fish2.draw(gl);
  //水槽の底と壁面
  drawTiles();
  gl.uniform1i(causLoc, false);

  //影の表示
  drawShadow();
  //透明物体(水面）

  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  w_object.diffuse[3] = 1 - transparency;
  w_object.ambient[3] = 1 - transparency;
  n = dummy.initVertexBuffers(gl);//ダミー
  n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);
  gl.disable(gl.BLEND);
  gl.depthMask(true);

  gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawTiles()
{
  //水槽の壁面（視点側の壁はカット）
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  //底（フロア）
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  for(i = 0; i < 4; i++)
  {
    plane0 = wall[i].plane; 
    n = wall[i].initVertexBuffers(gl);
    wall[i].draw(gl, n);
  }
  gl.disable(gl.CULL_FACE);
}

function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  
  var n = dummy.initVertexBuffers(gl);//ダミー
  var vCameraPos = new Vector3(camera.pos[0], camera.pos[1], camera.pos[2]);
  var vDirCamera = direction(floor0.vPos, vCameraPos);//フロア中心からのカメラ方向
  plane = floor0.plane;//影を落とす面
  var vDirPlane = new Vector3(plane[0], plane[1], plane[2]);
  if(dot(vDirCamera, vDirPlane) > 0)//裏から見たときは表示しない
  {
    //魚の影をフロアへ
    fish0.shadow = shadow_value;
    fish0.draw(gl);
    fish0.shadow = 0;
    fish1.shadow = shadow_value;
    fish1.draw(gl);
    fish1.shadow = 0;
    fish2.shadow = shadow_value;
    fish2.draw(gl);
    fish2.shadow = 0;
  }
  
  //fishの影を各壁面へ
  fish0.shadow = shadow_value;
  fish1.shadow = shadow_value;
  fish2.shadow = shadow_value;
  //n = obstacle.initVertexBuffers(gl);
  for(var i = 0; i < 4; i++) 
  {
    plane = wall[i].plane;//影を落とす面
    if(plane[0]*camera.pos[0]+plane[1]*camera.pos[1]+plane[2]*camera.pos[2] < 0) continue;
    fish0.draw(gl);
    fish1.draw(gl);
    fish2.draw(gl);
  }
  fish0.shadow = 0;//描画後は元に戻す
  fish1.shadow = 0;//描画後は元に戻す
  fish2.shadow = 0;//描画後は元に戻す

  var plane0;
  //壁面の影をフロアへ
  for(i = 0; i < 4; i++)
  {
    plane0 = wall[i].plane; 
    wall[i].shadow = shadow_value;
    n = wall[i].initVertexBuffers(gl);
    wall[i].draw(gl, n);
    wall[i].shadow = 0;
  }
 
  n = dummy.initVertexBuffers(gl);//ダミー
  //フロアに対する水面の影  
  w_object.shadow = shadow_value * (1 - transparency);
  n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);
  w_object.shadow = 0;
  gl.disable(gl.BLEND);
  gl.depthMask(true);

}

function setCausTexture()
{
  texObj = gl.createTexture();//テクスチャオブジェクトを作成
  gl.activeTexture(gl.TEXTURE0);
  //位置座標をテクスチャとして設定
  gl.bindTexture(gl.TEXTURE_2D, texObj);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  //数値テクスチャの割り当て 
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, texWidth, texHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, caus);
  //テクスチャを拡大・縮小する方法の指定 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // u_samplerの格納場所を取得する
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  // サンプラにテクスチャユニット0を設定する
  gl.uniform1i(samplerLoc, 0);
  //バインドを解除
  gl.bindTexture(gl.TEXTURE_2D, null);

}

function projectTexture()
{
  //投影マッピングの視野角を計算
  var distLight = Math.sqrt(light.pos[0]*light.pos[0] + light.pos[1]*light.pos[1] + light.pos[2]*light.pos[2]);
  fovy_proj = 2 * Math.atan(sizeX / distLight) * 180.0 / Math.PI;
  //テクスチャのビュー投影行列
  var texVpMatrix = new Matrix4();
  texVpMatrix.translate(0.5, 0.5, 0.0);
  texVpMatrix.perspective(fovy_proj, 1, 1, 50);
  texVpMatrix.lookAt(light.pos[0], light.pos[1], light.pos[2], 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
  //テクスチャのビュー投影行列をシェーダへ
  var texVpMatrixLoc = gl.getUniformLocation(gl.program, 'u_texVpMatrix');
  gl.uniformMatrix4fv(texVpMatrixLoc, false, texVpMatrix.elements);
}

//----------------------------------------------------------------
function calcDisp(dt)
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

function onClickMode()
{
  var nn;
  var radioM = document.getElementsByName("radioM");
  for(var i = 0; i < radioM.length; i++)
  {
     if(radioM[i].checked) nn = i;
  }
  if(nn == 0)      mode = "SINGLE";
  else if(nn == 1) mode = "CONTINUOUS";
}

function onChangeData2()
{
  adjustC = parseFloat(form2.adjustC.value);
  amp0 = parseFloat(form2.amp0.value);
  mu0 = parseFloat(form2.mu0.value);
  shadow_value = parseFloat(form2.shadow.value);
  transparency = parseFloat(form2.transparency.value);
  index = parseFloat(form2.index.value);
  
  display();
}

function onClickStart()
{
  fps = 0;
  time = 0;
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
//console.log(" ccx = " + camera.pos[0] + " ccy = " + camera.pos[1] + " ccz = " + camera.pos[2]);  

  display();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}



