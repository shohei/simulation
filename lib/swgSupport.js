//-------------------------------------------------------
//  swgSupport.js
//  光源，カメラ，視体積，マウス操作等のパラメータや関数を定義
//------------------------------------------------------------------

//光源
function Light()
{
  this.pos = [50.0, 0.0, 100.0, 1.0];//w=1:点光源，w=0:平行光源(光源方向）
  this.color = [1.0, 1.0, 1.0, 1.0];//拡散光・環境光・鏡面光みな同じ
  this.attenuation = [1.0, 0.0, 0.0];//一定減衰率,1次減衰率,2次減衰率
  this.spotCnt = [0.0, 0.0, 0.0];//スポット光源が照射される中心位置（スポット中心）
  this.spotCutoff = 30.0;//スポットライト・カットオフ
  this.spotExponent = 10.0;//スポットライト指数
};
//---------------------------------------------------
//カメラと視体積
function Camera() 
{
  //カメラ
  this.pos = [100.0, 0.0, 0.0];//位置（視点）
  this.cnt = [0.0, 0.0, 0.0];//注視点
  this.dist= 100.0; //注視点から視点までの距離(R)
  this.theta = 10.0;//仰角（水平面との偏角θ）
  this.phi = 0.0;  //方位角（φ）
  //視体積
  this.fovy = 40.0;//視野角
  this.near = 1.0; //前方クリップ面(近平面)
  this.far = 200.0;//後方クリップ面(遠平面)
  this.delta =5;// 0.02;//距離増分
};

Camera.prototype.getPos = function()
{
  this.pos[0] = this.cnt[0] + this.dist * Math.cos(DEG_TO_RAD * this.theta) * Math.cos(DEG_TO_RAD * this.phi);//x
  this.pos[1] = this.cnt[1] + this.dist * Math.cos(DEG_TO_RAD * this.theta) * Math.sin(DEG_TO_RAD * this.phi);//y
  this.pos[2] = this.cnt[2] + this.dist * Math.sin(DEG_TO_RAD * this.theta);//z
}
//----------------------------------------------------
//マウスによるカメラ操作
function mouseOperation(canvas, camera)
{
  var xStart, yStart;
  var flagMouse = false;
//  var flagMove = false;
  var rect;

  canvas.onmousedown = function(ev)
  {
    //Web page左上からの距離
    var x = ev.clientX; // マウスポインタのx座標
    var y = ev.clientY; // マウスポインタのy座標
    var wid = 30;
    var dd = camera.delta;//5;//0.2;//距離増分
    rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域

    if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) 
    {//canvas外
      flagMouse = false;  return; 
    }
      
    xStart = x; yStart = y;
    flagMouse = true;
	  
　  if(x > rect.left && x < rect.left + wid && y > rect.top && y < rect.top + wid)//canvasの左上
    {//dolly
      camera.dist -= dd;//近づく
    }
    else if(x > rect.right - wid && x < rect.right && y > rect.top && y < rect.top +wid)//右上
    {//dolly
      camera.dist += dd;//遠ざかる
    }
   
    else if(y > rect.top + canvas.height/2 - wid && y < rect.top + canvas.height/2 + wid)
    {//pan
      if(x > rect.left && x < rect.left + wid ) camera.phi -= 1.0;//真左
      else if(x > rect.right - wid && x < rect.right) camera.phi += 1.0;//真右  
      camera.cnt[0] = camera.pos[0] - camera.dist * Math.cos(DEG_TO_RAD * camera.phi) * Math.cos(DEG_TO_RAD * camera.theta);
	  camera.cnt[1] = camera.pos[1] - camera.dist * Math.sin(DEG_TO_RAD * camera.phi) * Math.cos(DEG_TO_RAD * camera.theta);
    }
    else if(x > rect.left + canvas.width/2 - wid && x < rect.left + canvas.width/2 + wid)
    {//tilt
      if(y < rect.top + wid ) camera.theta += 1.0;//真上
	  else if(y > rect.bottom - wid) camera.theta -= 1.0;//真下
	  
      camera.cnt[0] = camera.pos[0] - camera.dist * Math.cos(DEG_TO_RAD * camera.theta) * Math.cos(DEG_TO_RAD * camera.phi);
      camera.cnt[1] = camera.pos[1] - camera.dist * Math.cos(DEG_TO_RAD * camera.theta) * Math.sin(DEG_TO_RAD * camera.phi);
      camera.cnt[2] = camera.pos[2] - camera.dist * Math.sin(DEG_TO_RAD * camera.theta);
    }    
    else if(x > rect.left && x < rect.left + wid && y > rect.bottom - wid && y < rect.bottom)//左した
    {
      camera.fovy -= 1.0;//zoom in
    }
    else if(x > rect.right - wid && x < rect.right && y > rect.bottom - wid && y < rect.bottom)//右下
    {
      camera.fovy += 1.0;//zoom out
    }
    camera.getPos();
    display();
  }

  canvas.onmouseup = function(ev)
  {
    flagMouse = false;
  }
  canvas.onmousemove = function(ev)
  {
    if(!flagMouse) return;
    //Web page左上からの距離
    var x = ev.clientX; // マウスポインタのx座標
    var y = ev.clientY; // マウスポインタのy座標
    var dd = 0.2;//距離増分
    rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域
  
    if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom){ flagMouse = false; return;}//canvas外
	
    if(y < rect.top + canvas.height / 2) camera.phi += dd * (x - xStart) ;//tumble
    else camera.phi -= dd * (x - xStart) ;//tumble

    camera.theta += dd * (y - yStart) ;//crane

    camera.getPos();
    display();
    xStart = x;
    yStart = y;
  }
}
