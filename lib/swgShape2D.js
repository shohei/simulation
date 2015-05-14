//---------------------------------------------------
//      swgShape2D.js
//      WebGLによる2次元形状クラス(メソッドと関数）
//---------------------------------------------------
//Shape2Dクラス
function Shape2D()
{
  this.kind = "TRIANGLE";
  this.color = [0.0, 0.0, 0.0, 1.0];
  this.flagFill = false;
  this.vertices = [];
  this.angle = 0.0;
  this.transX = 0.0;
  this.transY = 0.0;
  this.scaleX = 1.0;
  this.scaleY = 1.0;
}

Shape2D.prototype.draw = function()
{
  if(this.kind == "TRIANGLE") this.vertices = makeTriangle();
  else if(this.kind == "RECTANGLE") this.vertices = makeRectangle(this.flagFill);
  else if(this.kind == "CIRCLE") this.vertices = makeCircle(this.flagFill);
   
　var pointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');
　gl.uniform1i(pointLoc, false);
　var colorLoc = gl.getUniformLocation(gl.program, 'u_flagColor');
　gl.uniform1i(colorLoc, false);

  var angLoc = gl.getUniformLocation(gl.program, 'u_angle');
  gl.uniform1f(angLoc, this.angle);
  var transXLoc = gl.getUniformLocation(gl.program, 'u_tx');
  gl.uniform1f(transXLoc, this.transX);
  var transYLoc = gl.getUniformLocation(gl.program, 'u_ty');
  gl.uniform1f(transYLoc, this.transY);
  var scaleXLoc = gl.getUniformLocation(gl.program, 'u_sx');
  gl.uniform1f(scaleXLoc, this.scaleX);
  var scaleYLoc = gl.getUniformLocation(gl.program, 'u_sy');
  gl.uniform1f(scaleYLoc, this.scaleY);
  
  var colLoc = gl.getUniformLocation(gl.program, 'u_color');
  gl.uniform4fv(colLoc, new Float32Array(this.color));

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  var n = this.vertices.length / 2;//頂点数
  //図形の描画
  if(this.flagFill == true)
  {
    if(this.kind == "CIRCLE")
    {//円
      gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
    }
    else//kind==TRIANGLE,RECTANGLE
    {//三角形と四角形
       gl.drawArrays(gl.TRIANGLES, 0, n);
    }
  }   
  else
  {//塗りつぶしなし
    if(this.kind == "LINES") gl.drawArrays(gl.LINES, 0, n);
    else if(this.kind == "LINE_STRIP") gl.drawArrays(gl.LINE_STRIP, 0, n);
    else//円、三角形、四角形
      gl.drawArrays(gl.LINE_LOOP, 0, n);
  }
}
//------------------------------------------------------------------------
//頂点座標作成
function makeTriangle() 
{
  //一辺が1の正三角形
  var vertices = [
    -0.5, -0.288675,  
     0.5, -0.288675,   
     0.0, 0.57735 
  ];
  return vertices;
}

function makeRectangle(flagFill) 
{ //一辺が1の正四角形
  if(flagFill == true)//塗りつぶし
  {
    var vertices = [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  
      0.5, 0.5,  -0.5,-0.5,   0.5, -0.5
    ] ;
  }
  else//枠線
  {
    var vertices = [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  0.5, -0.5
    ] ;
  }
  return vertices;
}

function makeCircle(flagFill)
{//直径が1の円
  var nSlice = 30;
  var theta0 = 2.0 * Math.PI / nSlice;
  var vertices = [];
  var theta, x, y;
  if(flagFill == true)
  {
    vertices[0] = 0.0;  vertices[1] = 0.0; //中心点
    for(var i = 0; i <= nSlice; i++)
    {
      theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[2 + i * 2] = x;
      vertices[3 + i * 2] = y;
    }
  }
  else
  {
    for(var i = 0; i < nSlice; i++)
    {
      theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[0 + i * 2] = x;
      vertices[1 + i * 2] = y;
    }
  }
  return vertices;
}
//---------------------------------------------------------------

function drawLines(data, col)
{
  //WebGLの線プリミティブで線幅1の線を作成
  var s = new Shape2D();
  s.kind = "LINES";
  for(var i = 0; i < data.length; i++) s.vertices[i] = data[i];
  s.color = getColor(col);
  s.draw();
}  

function drawLineStrip(data, col)
{
  //WebGLの線プリミティブで線幅1の線を作成
  var s = new Shape2D();
  s.kind = "LINE_STRIP";
  for(var i = 0; i < data.length; i++) s.vertices[i] = data[i];
  s.color = getColor(col);
  s.draw();
}  

function drawLine(x1, y1, x2, y2, width, col)
{//細い塗りつぶした四角形で太さのある線を作成
  var x0 = (x1 + x2) / 2;//中心点
  var y0 = (y1 + y2) / 2;
  var w = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
  var h = 2 * width / canvas.height;
  var ang = Math.atan2(y2-y1, x2-x1);//[rad]
  drawRectangle(x0, y0, w, h, true, col, ang);
}  

function drawRectangle(x0, y0, w, h, fill, col, ang)
{
  var s = new Shape2D();
  s.kind = "RECTANGLE";
  s.transX = x0;
  s.transY = y0;
  s.scaleX = w;
  s.scaleY = h;
  s.flagFill = fill;
  s.angle = ang;
  s.color = getColor(col);
  s.draw();
}  

function drawTriangle(x0, y0, sx, sy, fill, col, ang)
{
  //x0,y0:重心
  //sx=syのとき正三角形
  var s = new Shape2D();
  s.kind = "TRIANGLE";
  s.transX = x0;
  s.transY = y0;
  s.scaleX = sx;//回転前の横方向倍率
  s.scaleY = sy;//回転前の縦方向倍率
  s.flagFill = fill;
  s.angle = ang;//[rad]
  s.color = getColor(col);
  s.draw();
}  

function drawCircle(x0, y0, diaX, diaY, fill, col, ang)
{
  //diaX=diaYのとき円）
  var s = new Shape2D();
  s.kind = "CIRCLE";
  s.transX = x0;
  s.transY = y0;
  s.scaleX = diaX;//diaXは回転前のx方向直径
  s.scaleY = diaY;//diaYは回転前のy方向直径
  s.flagFill = fill;
  s.angle = ang;//[rad]
  s.color = getColor(col);
  s.draw();
}  

function drawArrow(x0, y0, len, width, col, ang)
{ 
  //+x軸方向を向いた矢印
  //ang[rad]
flagPoint = false;
  var h = 2 * width / canvas.height;
  var w = 0.353 * len;//矢じりの長さ
  var a = 3 * Math.PI / 4;//矢じりの傾斜角
  //中心線
  drawRectangle(x0, y0, len, h, true, col, ang);
  var ss = Math.sin(ang); var cc = Math.cos(ang);
  var x1 = len*3/8; var y1 = len/8;
  //上矢じり
  var x = x1 * cc - y1 * ss + x0;
  var y = x1 * ss + y1 * cc + y0;
  drawRectangle(x, y, w, h, true, col, ang+a);
  //下矢じり
  y1 = - len/8;
  x = x1 * cc - y1 * ss + x0;
  y = x1 * ss + y1 * cc + y0;
  drawRectangle(x, y, w,  h, true, col, ang-a);
}

function drawPoints(vertices, pointSize, pointType, col)
{
  //複数の点を描画
  var sizeLoc = gl.getUniformLocation(gl.program, 'u_size');
  gl.uniform1f(sizeLoc, pointSize);
  var typeLoc = gl.getUniformLocation(gl.program, 'u_type');
  gl.uniform1f(typeLoc, pointType);

　var pointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');
　gl.uniform1i(pointLoc, true);//flagPoint);
　var colorLoc = gl.getUniformLocation(gl.program, 'u_flagColor');
　gl.uniform1i(colorLoc, false);

  var color = getColor(col);
  var colLoc = gl.getUniformLocation(gl.program, 'u_color');
  gl.uniform4fv(colLoc, new Float32Array(color));
  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();  
  // バッファオブジェクトを有効にする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトに頂点データを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // attribute変数にバッファオブジェクトを割り当てる
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  // バッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);

  var n = vertices.length / 2;
  //描画する
  gl.drawArrays(gl.POINTS, 0, n); 
}

function drawRectangles(vertices, colors)
{
  //頂点座標と各頂点の色データを与えた四角形（colormapなど、塗りつぶしだけ）
　var pointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');
　gl.uniform1i(pointLoc, false);
　var colorLoc = gl.getUniformLocation(gl.program, 'u_flagColor');
　gl.uniform1i(colorLoc, true);

  var angLoc = gl.getUniformLocation(gl.program, 'u_angle');
  gl.uniform1f(angLoc, 0);//頂点座標は確定値なので回転・平行移動を0にする
  var transXLoc = gl.getUniformLocation(gl.program, 'u_tx');
  gl.uniform1f(transXLoc, 0);
  var transYLoc = gl.getUniformLocation(gl.program, 'u_ty');
  gl.uniform1f(transYLoc, 0);
  var scaleXLoc = gl.getUniformLocation(gl.program, 'u_sx');//scaleは1
  gl.uniform1f(scaleXLoc, 1);
  var scaleYLoc = gl.getUniformLocation(gl.program, 'u_sy');
  gl.uniform1f(scaleYLoc, 1);
  
  // 頂点バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  // 色バッファオブジェクトを作成する
  var colorBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var colorLoc = gl.getAttribLocation(gl.program, 'a_color');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(colorLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  var n = vertices.length / 2;//頂点数
//console.log(" n = " + n);
  gl.drawArrays(gl.TRIANGLES, 0, n);
  
  gl.disableVertexAttribArray(vertexLoc);
  gl.disableVertexAttribArray(colorLoc);

}
//-------------------------------------------------------
function getColor(col)
{
  var cc;
  var nn = col.length;
   
  if(col == "red") cc = [1, 0, 0, 1];
  else if(col == "green") cc = [0, 1, 0, 1];
  else if(col == "blue") cc = [0, 0, 1, 1];
  else if(col == "yellow") cc = [1, 1, 0, 1];
  else if(col == "cyan") cc = [0, 1, 1, 1];
  else if(col == "magenta") cc = [1, 0, 1, 1];
  else if(col == "dark_red") cc = [0.5, 0, 0, 1];
  else if(col == "dark_green") cc = [0, 0.5, 0, 1];
  else if(col == "dark_blue") cc = [0, 0, 0.5, 1];
  else if(col == "dark_yellow") cc = [0.5, 0.5, 0, 1];
  else if(col == "dark_cyan") cc = [0, 0.5, 0.5, 1];
  else if(col == "dark_magenta") cc = [0.5, 0, 0.5, 1];
  else if(col == "white") cc = [1, 1, 1, 1];
  else if(col == "black") cc = [0, 0, 0, 1];
  else if(col == "gray") cc = [0.5, 0.5, 0.5, 1];
  else if(col == "light_gray") cc = [0.7, 0.7, 0.7, 1];
  else if(col == "light_red") cc = [1, 0.7, 0.7, 1];
  else if(col == "light_green") cc = [0.7, 1, 0.7, 1];
  else if(col == "light_blue") cc = [0.7, 0.7, 1, 1];

  return cc;
}  
