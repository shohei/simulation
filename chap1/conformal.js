/*----------------------------------------------
     conformal.js
     等角写像の例
     z = ζ＋R^2/ζ
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
//円柱の半径
var Radius = 0.1;
var scale = new Vector3(1, 1, 0);
var flagCalc = true;
var flagPhys = false;
//解析領域矩形構造体
function Rect()
{
  this.scale = 1;//表示倍率
  this.size = 2.0;//矩形領域のサイズ(正方形)
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
}
var rect = new Rect();

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
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
  
  display();

}

function display()
{
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
	
  //計算領域描画
  drawRegion();
  
  flagCalc = form2.CalcPlane.checked; 
  flagPhys = form2.PhysPlane.checked; 
  Radius = parseFloat(form2.Radius.value);
 
  if(flagCalc) drawCalc();
  if(flagPhys) drawPhys();

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
  var sx = scale.x * rect.size / 2;//表示領域の幅は2*sx
  var sy = scale.y * rect.size / 2;//表示領域の高さは2*sy
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  
  //左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy;
  //格子間隔
  rect.delta = rect.size / rect.nMesh;
  //x-y座標
  drawLine(rect.left0.x, 0, rect.left0.x + scale.x * rect.size, 0, 1, "gray");
  drawLine(0, rect.left0.y, 0, rect.left0.y + scale.y * rect.size, 1, "gray");
}

function drawCalc()
{
  var i, theta, d_theta;
  //var z = new Vector3();//物理空間
  var w1 = new Vector3();//計算空間
  var w2 = new Vector3();//計算空間
  var data = [];
  d_theta = 5 * DEG_TO_RAD;
  
  var ct = 0;
  //計算空間の図
  //円群
  var r;
  for(j = 1; j < 10; j++)
  {
    r = j * Radius ;
    for(i = 0; i < 72; i++)
    { 
  　  theta = i * d_theta;
      w1.x = r * Math.cos(theta);
      w1.y = r * Math.sin(theta);
      w2.x = r * Math.cos(theta + d_theta);
      w2.y = r * Math.sin(theta + d_theta);  
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w1.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w1.y); ct++;    
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w2.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w2.y); ct++;   
    } 
    drawLines(data, "red");
  }
  //直線群
  var data = [];
  d_theta = 30 * DEG_TO_RAD;
  for(j = 0; j < 12; j++)
  {
    theta = j * d_theta ;
    for(i = 0; i < 10; i++)
    { 
  　  r = i * 0.1;
      w1.x = r * Math.cos(theta);
      w1.y = r * Math.sin(theta);
      w2.x = (r+0.1) * Math.cos(theta);
      w2.y = (r+0.1) * Math.sin(theta);  
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w1.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w1.y); ct++;    
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w2.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w2.y); ct++;   
    } 
    drawLines(data, "blue");
  }
}

function drawPhys()
{
  var i, theta, d_theta;
  var w1 = new Vector3();//計算空間
  var w2 = new Vector3();//計算空間
  var data = [];
  d_theta = 5 * DEG_TO_RAD;
  
  var ct = 0;
  //計算空間の図
  //円群
  var r ;
  for(j = 1; j < 10; j++)
  {
    r = j * Radius ;
    for(i = 0; i < 72; i++)
    { 
  　  theta = i * d_theta;
      w1.x = r * Math.cos(theta);
      w1.y = r * Math.sin(theta);
//if(j==1) console.log("AAA i = " + i + " theta = " + theta + " x = " + w1.x + " y = " + w1.y);
      w2.x = r * Math.cos(theta + d_theta);
      w2.y = r * Math.sin(theta + d_theta); 
      w1 = mapping(w1);
      w2 = mapping(w2);
//if(j==1) console.log("BBB i = " + i + " theta = " + theta + " x = " + w1.x + " y = " + w1.y);
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w1.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w1.y); ct++;    
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w2.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w2.y); ct++;   
    } 
    drawLines(data, "red");
  }
  //直線群
  var data = [];
  var r = Radius;
  d_theta = 30 * DEG_TO_RAD;
  var dd = 0.01;
  for(j = 0; j < 12; j++)
  {
    theta = j * d_theta ;
    for(i = 1; i < 1/dd; i++)
    { 
  　  r = i * dd;
      w1.x = r * Math.cos(theta);
      w1.y = r * Math.sin(theta);
      w2.x = (r+dd) * Math.cos(theta);
      w2.y = (r+dd) * Math.sin(theta);  
      w1 = mapping(w1);
      w2 = mapping(w2);
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w1.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w1.y); ct++;    
      data[ct] = rect.left0.x + scale.x * (rect.size/2 + w2.x); ct++;
      data[ct] = rect.left0.y + scale.y * (rect.size/2 + w2.y); ct++;   
    } 
    drawLines(data, "blue");
  }
}

function mapping(pos)
{
  //このposは矩形領域中心を原点とした座標
  //計算平面から物理平面への座標変換
  var rad = mag(pos);
  var rc = Radius * Radius / rad;
  var theta = Math.atan2(pos.y, pos.x); 
  var alpha= parseFloat(form2.alpha.value);
  var ang = 2.0 * alpha * DEG_TO_RAD;

  pos.x = rad * Math.cos(theta) + rc * Math.cos(theta + ang);
  pos.y = rad * Math.sin(theta) - rc * Math.sin(theta + ang);
  return pos;
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
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



