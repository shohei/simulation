/*----------------------------------------------
     potentialPlate.js
     ポテンシャル流れ
      一様流れ+円柱(平板)+渦
     粒子アニメーション
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;
//animation
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagStep = false;
var flagReset = false;
//ポテンシャル流れ
var alpha = 0;//一様流れの傾斜角
var Gamma = 1;//循環
var Phi = [];//ポテンシャル
var Psi = [];//流れ関数
var Press = [];//圧力
var VelX = [];//格子点の速度
var VelY = [];
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagUniformPlate = true;
var flagVortex = false;
var flagPotential = true;
var flagStream = false;
var flagVelocity = false;
var flagGrid = false;
var flagPressure = false;
var flagStart = false;
var flowVelocity = 1;
var radCylinder = 0.1;
var flagCylinder = false;
var flagMapping = false;
var nLine = 40;//流線,ポテンシャルの表示本数
var range = 1;//その範囲
var maxVelocity = 2.5;//圧力のカラー表示に必要
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

//解析領域矩形
function Rect()
{
  this.scale = 1;//表示倍率
  this.size = 2;//矩形領域のサイズ(正方形だけ）
  this.nMesh = 50;//全体の分割数(X,Y共通）
  this.delta ;//格子間隔
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
  
  form2.nMesh.value = rect.nMesh;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.range.value = range;

  calculate();//ポテンシャル流れの計算
  
  initParticle();//粒子アニメーションの初期化
  
  var fps = 0;//フレームレート
  var timestep = 0;
  var lastTime = new Date().getTime();
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;//全経過時間
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //0.5秒間隔で表示
      timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    {
      display();      
      drawParticle(timestep);     
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();
}

function calculate()
{  
  //ポテンシャル流れの計算パラメータ
  flagUniformPlate = form2.Uniform.checked ;
  flagVortex = form2.Vortex.checked ;

  rect.nMesh = parseInt(form2.nMesh.value);
  rect.delta = rect.size / rect.nMesh;
  alpha = parseFloat(form2.alpha.value);
  radCylinder = parseFloat(form2.radCylinder.value);
  Gamma = parseFloat(form2.Gamma.value);
  maxVelocity = parseFloat(form2.maxVelocity.value);
  var maxVel2 = maxVelocity * maxVelocity;//圧力計算時に必要

  var i, j;
  
  for(i = 0; i <= rect.nMesh; i++)
  {//配列の2次元化
    Phi[i] = [];//ポテンシャル
    Psi[i] = [];//流れ関数
    VelX[i] = [];//速度
    VelY[i] = [];
    Press[i] = [];
  }

  //ポテンシャル，流れ関数,速度のクリア
  for (j = 0; j <= rect.nMesh; j++)
  {  
    for (i = 0; i <= rect.nMesh; i++) 
      Phi[i][j] = Psi[i][j] = VelX[i][j] = VelY[i][j] = Press[i][j] = 0.0;
  }
	
  var z = new Vector3();
  var rr = 0, c1, c2, r2, r4;
  var rad0 = 0.001;
  var radC2 = radCylinder * radCylinder;//円柱半径の2乗
  var ang = alpha * DEG_TO_RAD;//平板の迎え角
  var mag;

  for (i = 0; i <= rect.nMesh; i++)
  {
    z.x = rect.delta * (i - rect.nMesh / 2);//中心のポテンシャルを0
    //x1 = z.x + distA;
    //x2 = z.x - distA;
    for (j = 0; j <= rect.nMesh; j++)
    {
      z.y = rect.delta * (j - rect.nMesh / 2);
      if(flagUniformPlate) 
      {
	    Phi[i][j] = flowVelocity * z.x;//(z.x * Math.cos(ang) + z.y * Math.sin(ang));
		Psi[i][j] = flowVelocity * z.y;//(z.y * Math.cos(ang) - z.x * Math.sin(ang));
		VelX[i][j] = flowVelocity ;
		VelY[i][j] = 0;
		//円柱(Plate)
        if (z.x == 0 && z.y == 0)
        {//対数的特異点
		  z.x = rect.delta / 1000.0;
          z.y = rect.delta / 1000.0;
        }
        r2 = mag2(z);//2乗距離
        r4 = r2 * r2;
        Phi[i][j] += flowVelocity * radC2 * z.x / r2;
        Psi[i][j] -= flowVelocity * radC2 * z.y / r2;
		VelX[i][j] -= flowVelocity * radC2 * ( z.x * z.x - z.y * z.y ) / r4;
		VelY[i][j] -= 2.0 * flowVelocity * radC2 * z.x * z.y / r4;
      }

	  if (flagVortex)//うず
	  {
        if(z.x == 0 && z.y == 0)
        {//原点は対数的特異点
          z.x = rect.delta / 1000.0;
          z.y = rect.delta / 1000.0;;
        }
		r2 = mag2(z);
		if(r2 < rad0) r2 = rad0;//中心付近の速度を抑えるため
        Psi[i][j] -= Gamma * (Math.log(r2) / (4.0 * Math.PI));
        Phi[i][j] += Gamma * Math.atan2(z.y, z.x) / (2.0 * Math.PI);
		VelX[i][j] -= Gamma * z.y / r2 / (2.0 * Math.PI);
		VelY[i][j] += Gamma * z.x / r2 / (2.0 * Math.PI);
      } 
      Press[i][j] = 1.0 - (VelX[i][j]*VelX[i][j] + VelY[i][j]*VelY[i][j]) / maxVel2;
      if(Press[i][j] < 0.0) Press[0] = 0.0;
    }
  }
  display();
}

function display()
{
  flagPotential = form2.phi.checked;
  flagStream = form2.psi.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
  flagPressure = form2.pressure.checked;
  flagPoint = false;
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

  if( flagPressure) drawPressure(); 
  if( flagPotential )  drawContour(Phi, "red");//drawPotential();//
  if( flagStream ) drawContour(Psi, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
   
  flagCylinder = form2.Cylinder.checked;  
  var theta = Math.atan2(scale.y, scale.x) - Math.PI / 4;
  if(flagCylinder)//円柱/平板表示
  {
    if(!flagMapping) drawCircle(0, 0, 2*radCylinder * scale.x, 2*radCylinder * scale.y, true, "gray", 0) ;
    else drawRectangle(0, 0, 4*radCylinder * scale.x, 0.02, true, "gray", - (alpha+theta) * DEG_TO_RAD);
  }

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
  var sy = scale.y * rect.size / 2;//表示領域の高さは2*sx
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

function drawContour(PP, col)
{
  nLine = parseFloat(form2.nLine.value);
  range = parseFloat(form2.range.value);
  var maxP =  flowVelocity * range;
  var minP = -flowVelocity * range;
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var data = [];
  var x0 = rect.size / 2;//矩形領域中心座標
  var y0 = rect.size / 2;
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    for(i = 0; i < rect.nMesh-1; i++)
	{
	  for(j = 0; j < rect.nMesh; j++)
	  {//三角形セルに分割
	    p[0] = PP[i][j];    x[0] = i * rect.delta;     y[0] = j * rect.delta;
	    p[1] = PP[i][j+1];  x[1] = i * rect.delta;     y[1] = (j+1) * rect.delta;
	    p[2] = PP[i+1][j+1];x[2] = (i+1) * rect.delta; y[2] = (j+1) * rect.delta;
	    p[3] = PP[i+1][j];  x[3] = (i+1) * rect.delta; y[3] = j * rect.delta;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -10.0; y1 = -10.0; 
					
		  if((p[m] <= pp && pp < p[m+1]) || (p[m] >= pp && pp > p[m+1]))
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
	          createData();
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
              createData();		  
	        }
          }
        }//m
	  }//j
	}//i  
  }//k
  drawLines(data, col);
  
  function createData()
  {
    var pos1 = new Vector3();
    var pos2 = new Vector3();
    var dir = new Vector3();
    pos1.x = x1 - x0; pos1.y = y1 - y0;//矩形領域中心を原点とした座標
    pos2.x = x2 - x0; pos2.y = y2 - y0;
    var rr1 = mag(pos1);
    var rr2 = mag(pos2);
    var rad, eps = radCylinder / 50.0;;
    if(rr1 < radCylinder || rr2 < radCylinder) return;
    if(flagMapping) 
    {
      pos1 = mapping(pos1); 
      pos2 = mapping(pos2); 
    }
    x1 = pos1.x + x0; y1 = pos1.y + y0; 
    x2 = pos2.x + x0; y2 = pos2.y + y0;
    data.push(rect.left0.x + scale.x * x1);
    data.push(rect.left0.y + scale.y * y1);
	data.push(rect.left0.x + scale.x * x2);
	data.push(rect.left0.y + scale.y * y2);
  }    
}

function mapping(pos)
{
  //このposは矩形領域中心を原点とした座標
  //計算平面から物理平面への座標変換
  var rad = mag(pos);
  var rc = radCylinder * radCylinder / rad;
  var theta = Math.atan2(pos.y, pos.x);
  var ang = 2.0 * alpha * DEG_TO_RAD;

  pos.x = rad * Math.cos(theta) + rc * Math.cos(theta + ang);
  pos.y = rad * Math.sin(theta) - rc * Math.sin(theta + ang);

  return pos;
}

function drawVelocity()
{
  arrowScale = parseFloat(form2.arrowScale.value);
  arrowWidth = parseFloat(form2.arrowWidth.value);
  intervalV = parseFloat(form2.intervalV.value);
  
  var i, j, k;
  var nGridX = rect.nMesh + 1;
  var pos = new Vector3();//格子点の座標
  var pos1 = new Vector3();//矢の終端
  var pos2 = new Vector3();//矢の先端
  var pos0 = new Vector3(rect.size / 2, rect.size / 2, 0);//矩形領域中心
  var VelMX, VelMY;
  var cc = 1 / 100; 

  //写像変換後の速度はすべての格子点で求めておく
  //描画
  var theta, magni, x0, y0, vx, vy;
  for(i = 1; i < rect.nMesh; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < rect.nMesh; j++)
	{
	  if(j % intervalV != 0) continue;
	  k = i + j * nGridX;
	  //矩形領域中心を原点とした格子点の座標
      pos.x = i * rect.delta - pos0.x;
	  pos.y = j * rect.delta - pos0.y;
	  if(mag(pos) <= radCylinder) continue;
	  if(!flagMapping)
	  {
        vx = VelX[i][j] * scale.x;
        vy = VelY[i][j] * scale.y;
	    magni = Math.sqrt(vx*vx + vy*vy) ;
	    theta = Math.atan2(vy, vx);
	  }
	  else
	  { 
	    //矢の終端と先端の位置を変換前の速度に比例させて求めておく
        pos1.x = pos.x - VelX[i][j] * cc;//仮の矢印の終端
        pos1.y = pos.y - VelY[i][j] * cc;
        pos2.x = pos.x + VelX[i][j] * cc;//仮の矢印の先端
	    pos2.y = pos.y + VelY[i][j] * cc;
        pos = mapping(pos); //格子点も移動することに注意
        pos1 = mapping(pos1); 
        pos2 = mapping(pos2);
        VelMX = (pos2.x - pos1.x) * scale.x / cc;
        VelMY = (pos2.y - pos1.y) * scale.y / cc;
	    
        theta = Math.atan2(VelMY, VelMX);
        magni = Math.sqrt(VelMX * VelMX + VelMY * VelMY);
      }
	  x0 = rect.left0.x + scale.x * (pos.x + pos0.x);
      y0 = rect.left0.y + scale.y * (pos.y + pos0.y);
	  drawArrow(x0, y0, magni * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  for(i = 1; i < rect.nMesh; i++)
  {
    drawLine(rect.left0.x + scale.x * i * rect.delta, rect.left0.y,
      rect.left0.x + scale.x * i * rect.delta, rect.left0.y + scale.y * rect.size, 1, "blue");
  }
  for(j = 1; j < rect.nMesh; j++)
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * rect.delta,
     rect.left0.x + scale.x * rect.size, rect.left0.y + scale.y * j * rect.delta, 1, "blue");
  }
}

function drawPressure()
{
  var i, j, k, count;
  var pos = [];
  for(i = 0; i < 4; i++) pos[i] = new Vector3(); 
  var pos0 = new Vector3(rect.size / 2.0, rect.size / 2.0, 0);
  var dir = new Vector3(); 
  var pp = [], rr = [], gg = [], bb = [], xx = [], yy = [];
  var rad, eps = radCylinder / 50.0;
  var vertices = [];
  var colors = [];

  for (i = 0; i < rect.nMesh; i++)
  {
    for (j = 0; j < rect.nMesh; j++)
    {
      pos[0].x = i * rect.delta;     pos[0].y = j * rect.delta;
	  pos[1].x = (i+1) * rect.delta; pos[1].y = j * rect.delta;
	  pos[2].x = (i+1) * rect.delta; pos[2].y = (j+1) * rect.delta;
      pos[3].x = i * rect.delta;     pos[3].y = (j+1) * rect.delta;
	  for(k = 0; k < 4; k++) { pos[k].x -= pos0.x; pos[k].y -= pos0.y; }//矩形領域中心を原点とした座標

      //４個とも円柱内部ならば表示しない
	  if(mag(pos[0]) < radCylinder && mag(pos[1]) < radCylinder && 
         mag(pos[2]) < radCylinder && mag(pos[3]) < radCylinder) continue;

      //円柱内部に残った格子点を円柱上に移動
	  count = 0;
	  for(k = 0; k < 4; k++)
	  {
		rad = mag(pos[k]);
		if(rad < radCylinder)
		{
		  dir.x = pos[k].x / rad; dir.y = pos[k].y / rad;
		  count = 0;
		  while( rad < radCylinder)
		  {
			rad += eps;
			count++;
			if(count > 50) break;
		  }
		  pos[k] = mul(dir , rad);
		}
      }

      pp[0] = Press[i][j]; pp[1] = Press[i+1][j]; 
      pp[2] = Press[i+1][j+1]; pp[3] = Press[i][j+1];
      //圧力-色変換
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

      if(flagMapping)
      {
        for(k = 0; k < 4; k++) pos[k] = mapping(pos[k]);
      }
      
      for(k = 0; k < 4; k++)
      {
        xx[k] = rect.left0.x + scale.x * (pos[k].x + pos0.x);
        yy[k] = rect.left0.y + scale.y * (pos[k].y + pos0.y);
      }
      //四角形（三角形2個分のデータ）
      vertices.push(xx[0]); vertices.push(yy[0]);
      vertices.push(xx[1]); vertices.push(yy[1]);
      vertices.push(xx[2]); vertices.push(yy[2]);
      vertices.push(xx[0]); vertices.push(yy[0]);
      vertices.push(xx[2]); vertices.push(yy[2]);
      vertices.push(xx[3]); vertices.push(yy[3]);
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[1]); colors.push(gg[1]); colors.push(bb[1]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[3]); colors.push(gg[3]); colors.push(bb[3]); 
    }
  }
  drawRectangles(vertices, colors);
}

//-----------------------------------------------------------------
function Particle2D()
{
  this.pos = new Vector3();
  this.vel = new Vector3();
}
var countP = 0;
var pa = [];//particle
var sizeP = 3;
var speedCoef = 1;
var countPeriod = 0;
var period = 0.0;//[s]
var numMaxP =10000;//最大個数
var num0 = 100;
var typeP = 1;

function initParticle()
{
  //粒子インスタンス
  for(var i = 0; i < numMaxP; i++)　pa[i] = new Particle2D();
}

function drawParticle(dt)
{
  flagPoint = true;  
  var k, k0, K = 0;
  var dataP = []; 
  var vel = new Vector3();
  var pos0 = new Vector3(rect.size / 2, rect.size / 2, 0);//矩形領域中心
  var pos = new Vector3();
 
  if(!flagFreeze && countPeriod == 0)
  {
    for(k0 = 0; k0 < num0; k0++)
	{
	  k = countP + k0;
	  createParticle(k);
	}
	countP += num0;
  }

  K = 0;
  for(k = 0; k < numMaxP; k++)
  {
    vel = getVelocityParticle(pa[k].pos);

	if(!flagFreeze) {
      pa[k].pos.x += vel.x * dt * speedCoef;
      pa[k].pos.y += vel.y * dt * speedCoef;
    }
    pos.x = pa[k].pos.x - pos0.x;
    pos.y = pa[k].pos.y - pos0.y;
    if(flagMapping) 
    {
      pos = mapping(pos);
    }
    pos.x += pos0.x; pos.y += pos0.y; 
	if(pos.x >= 0.0 && pos.x < rect.size && pos.y >= 0.0 && pos.y < rect.size) 
    { 
      dataP[2*K] = rect.left0.x+ pos.x * scale.x; 
      dataP[2*K+1] = rect.left0.y + pos.y * scale.y; 
      K++;
    }
    else{
      if( countPeriod == 0) createParticle(k); 
    }
  }

  drawPoints(dataP, sizeP, typeP, "black");
  
  if(countP > numMaxP-num0) countP = 0;
  
  countPeriod += dt;
  if(countPeriod > period) countPeriod = 0;
}

function createParticle(k)
{
  pa[k].pos.x = 0.0;//左端(left0)からの位置
  pa[k].pos.y = rect.size * getRandom(0, 1);
}

function getVelocityParticle(pos)
{
  var vel = new Vector3();

  var i, j, I, J;

  //格子番号を取得
  I = 0; J = 0;
  for(i = 0; i < rect.nMesh; i++)
  {
	if(i * rect.delta < pos.x && (i+1) * rect.delta > pos.x) I = i;
  }
  for(j = 0; j < rect.nMesh; j++)
  {
 	if(j * rect.delta < pos.y && (j+1) * rect.delta > pos.y) J = j;
  }
  var a =  pos.x / rect.delta - I;
  var b =  pos.y / rect.delta - J;
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
  calculate();
}

function onMapping()
{
  flagMapping = form2.Mapping.checked;
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

//-------------------------------------------------------------
function onClickP()
{ 
  numMaxP = parseInt(form2.numMaxP.value);
  num0 = parseInt(form2.num0.value);
  period = parseFloat(form2.period.value);
  speedCoef = parseFloat(form2.speedCoef.value);
  sizeP= parseFloat(form2.sizeP.value);
  typeP= parseFloat(form2.typeP.value);
}

function onClickStart()
{
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  flagStart = true;
  flagStep = false;
  flagFreez = false;
  lastTime = new Date().getTime();
  initParticle();
}
function onClickFreeze()
{
  if(flagStart) { flagStart = false; }
  else { flagStart = true; elapseTime = elapseTime0; }
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
  elapseTime = 0;
  flagStart = false;
  flagStep = false;
  initParticle();
  form1.time.value = "0";
  display();
}


