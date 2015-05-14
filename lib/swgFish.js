/*********************************************************************
     swgFish.js
     
***********************************************************************/

function Fish0()
{
  //基本姿勢は＋ｚ方向を向き、左が＋ｘ、右が-X、魚の上方向は＋ｙ
  this.flagDebug = false;
  this.shadow = 0.0;
  
  //robotの位置・姿勢
  this.vPos = new Vector3();
  this.vEuler = new Vector3();
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換
  this.radius = 3;//円運動の半径
  this.period = 10;//１周回転の周期
  this.periodSwing = 2;//胸鰭の周期
  this.maxAngSwing = 20;//胸鰭の最大角度
  this.angleZ = 20;//ｚ軸に対する魚体の傾斜角
  
  //partsの種類や色・サイズなど
  this.trunk =  new Rigid_HS();
  this.trunk.kind = "SUPER2";//胴体
  this.trunk.diffuse = [0.8, 0.7, 0.2, 1.0];
  this.trunk.ambient = [0.6, 0.6, 0.1, 1.0];
  this.trunk.size1 = [0.5, 0.1, 0.5];
  this.trunk.size2 = [0.5, 0.1, 0.5];
  this.trunk.nSlice = 20;
  this.trunk.nStack = 20;
  this.trunk.eps1 = 2.0;
  this.trunk.eps2 = 1.5;
  this.trunk.middle = 0.8;
  this.trunk.angle2 = 0;
  this.trunk.type = 0;
  
  this.eyeL = new Rigid_HS();
  this.eyeL.kind = "SPHERE"//左目
  this.eyeL.diffuse = [0.3, 0.3, 0.6, 1.0];
  this.eyeL.ambient = [0.2, 0.2, 0.4, 1.0];
  this.eyeL.nSlice = 6;
  this.eyeL.nStack = 6;
  this.eyeL.vSize = new Vector3(0.1, 0.1, 0.1);
  
  this.eyeR = new Rigid_HS();
  this.eyeR.kind = "SPHERE"//右目
  this.eyeR.diffuse = [0.3, 0.3, 0.6, 1.0];
  this.eyeR.ambient = [0.2, 0.2, 0.4, 1.0];
  this.eyeR.nSlice = 6;
  this.eyeR.nStack = 6;
  this.eyeR.vSize = new Vector3(0.1, 0.1, 0.1);

  this.mouth = new Rigid_HS();
  this.mouth.kind = "SPHERE"//口
  this.mouth.diffuse = [0.8, 0.5, 0.3, 1.0];
  this.mouth.ambient = [0.6, 0.4, 0.2, 1.0];
  this.mouth.nSlice = 6;
  this.mouth.nStack = 6;
  this.mouth.vSize = new Vector3(0.2, 0.1, 0.2);

  this.tail = new Rigid_HS();
  this.tail.kind = "CYLINDER"//尾
  this.tail.diffuse = [0.8, 0.7, 0.2, 1.0];
  this.tail.ambient = [0.6, 0.6, 0.1, 1.0];
  this.tail.nSlice = 8;
  this.tail.nStack = 8;
  this.tail.radiusRatio = 5.0;
  this.tail.vSize = new Vector3(0.01, 0.005, 0.8);
  
} 

Fish0.prototype.draw = function(gl)
{
  this.trunk.shadow = this.shadow;
  this.eyeL.shadow = this.shadow;
  this.eyeR.shadow = this.shadow;
  this.mouth.shadow = this.shadow;
  this.tail.shadow = this.shadow;
  
  //スタック行列の確保
  var stackMat = [];
  for(var i = 0; i < 2; i++) stackMat[i] = new Matrix4();
 
  var modelMatrix = new Matrix4(); //モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ

  //全体(root)
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  stackMat[0].copy(modelMatrix);//モデル行列を保存(ここまでのモデル行列は他のpaarts[]にも影響する)
  var n = this.trunk.initVertexBuffers(gl);
  this.trunk.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeLに影響するモデル行列をスタックからpop 
  //左目
  modelMatrix.translate(this.trunk.size1[0]*0.4, 0.05, this.trunk.size1[2]*0.5);//に平行移動
  modelMatrix.scale(this.eyeL.vSize.x, this.eyeL.vSize.y, this.eyeL.vSize.z);
  n = this.eyeL.initVertexBuffers(gl);
  this.eyeL.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //右目
  modelMatrix.translate(-this.trunk.size1[0]*0.4, 0.05, this.trunk.size1[2]*0.5);
  modelMatrix.scale(this.eyeR.vSize.x, this.eyeR.vSize.y, this.eyeR.vSize.z);
  n = this.eyeR.initVertexBuffers(gl);
  this.eyeR.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //口
  modelMatrix.translate(0, 0.0, this.trunk.size1[2]*0.85);
  modelMatrix.scale(this.mouth.vSize.x, this.mouth.vSize.y, this.mouth.vSize.z);
  n = this.mouth.initVertexBuffers(gl);
  this.mouth.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //尾
  modelMatrix.translate(0, 0.0, -this.trunk.size2[2]);
  modelMatrix.scale(this.tail.vSize.x, this.tail.vSize.y, this.tail.vSize.z);
  modelMatrix.translate(0.0, 0.0, -this.tail.vSize.z/2);//中心位置を持ち上げる
  n = this.tail.initVertexBuffers(gl);
  this.tail.draw(gl, n, modelMatrix);
}

Fish0.prototype.motion = function(t)
{
  //左回り回転
  var theta0 = Math.atan2(this.vPos0.y , this.vPos0.x);
  var theta = 2*Math.PI * t / this.period + theta0;//x軸からの角度
  this.vPos.x = this.radius * Math.cos( theta );
  this.vPos.y = this.radius * Math.sin( theta ); 
   
  this.vEuler.x = 90;
  this.vEuler.y = this.angleZ;
  this.vEuler.z = 180 * theta / Math.PI + 180;//方向
  this.trunk.angle2 = this.maxAngSwing * Math.sin(2.0 * Math.PI * t / this.periodSwing);
}

//-------------------------------------------------------------------------------
    Fish1
//------------------------------------------------------------------------------
function Fish1()
{
  //基本姿勢は＋ｚ方向を向き、左が＋ｘ、右が-X、魚の上方向は＋ｙ
  this.flagDebug = false;
  this.shadow = 0.0;
  
  //robotの位置・姿勢
  this.vPos = new Vector3();
  this.vEuler = new Vector3();
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換
  this.radius = 3.8;//円運動の半径
  this.period = 20;//１周回転の周期
  this.periodSwing = 1;//後胴体の周期
  this.maxAngSwing = 10;//その最大角度
  this.angleZ = 2;//ｚ軸に対する魚体の傾斜角
  
  //partsの種類や色・サイズなど
  this.trunk =  new Rigid_HS();
  this.trunk.kind = "SUPER2";//胴体
  this.trunk.diffuse = [0.8, 0.3, 0.2, 1.0];
  this.trunk.ambient = [0.6, 0.2, 0.1, 1.0];
  this.trunk.size1 = [0.5, 0.1, 0.5];
  this.trunk.size2 = [0.5, 0.1, 0.5];
  this.trunk.nSlice = 20;
  this.trunk.nStack = 20;
  this.trunk.eps1 = 1.5;
  this.trunk.eps2 = 1.5;
  this.trunk.middle = 0.8;
  this.trunk.angle2 = 0;
  this.trunk.type = 1;
  
  this.eyeL = new Rigid_HS();
  this.eyeL.kind = "SPHERE"//左目
  this.eyeL.diffuse = [0.3, 0.3, 0.4, 1.0];
  this.eyeL.ambient = [0.2, 0.2, 0.3, 1.0];
  this.eyeL.nSlice = 6;
  this.eyeL.nStack = 6;
  this.eyeL.vSize = new Vector3(0.1, 0.1, 0.1);
  
  this.eyeR = new Rigid_HS();
  this.eyeR.kind = "SPHERE"//右目
  this.eyeR.diffuse = [0.3, 0.3, 0.4, 1.0];
  this.eyeR.ambient = [0.2, 0.2, 0.3, 1.0];
  this.eyeR.nSlice = 6;
  this.eyeR.nStack = 6;
  this.eyeR.vSize = new Vector3(0.1, 0.1, 0.1);

  this.mouth = new Rigid_HS();
  this.mouth.kind = "SPHERE"//口
  this.mouth.diffuse = [0.5, 0.3, 0.3, 1.0];
  this.mouth.ambient = [0.4, 0.2, 0.2, 1.0];
  this.mouth.nSlice = 6;
  this.mouth.nStack = 6;
  this.mouth.vSize = new Vector3(0.2, 0.1, 0.2);

  this.tail = new Rigid_HS();
  this.tail.kind = "CYLINDER"//尾
  this.tail.diffuse = [0.8, 0.3, 0.2, 1.0];
  this.tail.ambient = [0.6, 0.2, 0.1, 1.0];
  this.tail.nSlice = 8;
  this.tail.nStack = 8;
  this.tail.radiusRatio = 0.2
  this.tail.vSize = new Vector3(0.4, 0.05, 0.3);
  
} 

Fish1.prototype.draw = function(gl)
{
  this.trunk.shadow = this.shadow;
  this.eyeL.shadow = this.shadow;
  this.eyeR.shadow = this.shadow;
  this.mouth.shadow = this.shadow;
  this.tail.shadow = this.shadow;
  
  //スタック行列の確保
  var stackMat = [];
  for(var i = 0; i < 2; i++) stackMat[i] = new Matrix4();
 
  var modelMatrix = new Matrix4(); //モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ

  //全体(root)
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  stackMat[0].copy(modelMatrix);//モデル行列を保存(ここまでのモデル行列は他のpaarts[]にも影響する)
  var n = this.trunk.initVertexBuffers(gl);
  this.trunk.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeLに影響するモデル行列をスタックからpop 
  //左目
  modelMatrix.translate(this.trunk.size1[0]*0.4, 0.0, this.trunk.size1[2]*0.8);//に平行移動
  modelMatrix.scale(this.eyeL.vSize.x, this.eyeL.vSize.y, this.eyeL.vSize.z);
  n = this.eyeL.initVertexBuffers(gl);
  this.eyeL.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //右目
  modelMatrix.translate(-this.trunk.size1[0]*0.4, 0.0, this.trunk.size1[2]*0.8);
  modelMatrix.scale(this.eyeR.vSize.x, this.eyeR.vSize.y, this.eyeR.vSize.z);
  n = this.eyeR.initVertexBuffers(gl);
  this.eyeR.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //口
  modelMatrix.translate(0, 0.0, this.trunk.size1[2]*0.85);
  modelMatrix.scale(this.mouth.vSize.x, this.mouth.vSize.y, this.mouth.vSize.z);
  n = this.mouth.initVertexBuffers(gl);
  this.mouth.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //尾
  modelMatrix.rotate(this.trunk.angle2*0.5, 1, 0, 0);//尾びれを揺らす
  modelMatrix.translate(0, 0.0, -this.trunk.size2[2]*0.8);
  modelMatrix.scale(this.tail.vSize.x, this.tail.vSize.y, this.tail.vSize.z);
  modelMatrix.translate(0.0, 0.0, -this.tail.vSize.z/2);//中心位置を持ち上げる
  n = this.tail.initVertexBuffers(gl);
  this.tail.draw(gl, n, modelMatrix);
}

Fish1.prototype.motion = function(t)
{
  //左回り回転
  var theta0 = Math.atan2(this.vPos0.y , this.vPos0.x);
  var theta = 2*Math.PI * t / this.period + theta0;//x軸からの角度
  this.vPos.x = this.radius * Math.cos( theta );
  this.vPos.y = this.radius * Math.sin( theta ); 
   
  this.vEuler.x = 90;
  this.vEuler.y = this.angleZ;
  this.vEuler.z = 180 * theta / Math.PI + 180;//方向
  this.trunk.angle2 = this.maxAngSwing * Math.sin(2.0 * Math.PI * t / this.periodSwing);
}

//-----------------------------------------------------------------------------------------------
    Fish2
//-----------------------------------------------------------------------------------------------
function Fish2()
{
  //基本姿勢は＋ｚ方向を向き、左が＋ｘ、右が-X、魚の上方向は＋ｙ
  this.flagDebug = false;
  this.shadow = 0.0;
  
  //robotの位置・姿勢
  this.vPos = new Vector3();
  this.vPos0 = new Vector3();//初期位置
  this.vEuler = new Vector3();
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換
  this.radius = 3.5;//円運動の半径
  this.period = 15;//１周回転の周期
  this.periodSwing = 2;//周期
  this.maxAngSwing = 30;//最大角度
  this.angleZ = 5;//ｚ軸に対する魚体の傾斜角
  
  //partsの種類や色・サイズなど
  this.trunk =  new Rigid_HS();
  this.trunk.kind = "SUPER2";//胴体
  this.trunk.diffuse = [0.2, 0.7, 0.9, 1.0];
  this.trunk.ambient = [0.1, 0.4, 0.6, 1.0];
  this.trunk.size1 = [0.4, 0.6, 1];
  this.trunk.size2 = [0.4, 0.6, 0.7];
  this.trunk.nSlice = 20;
  this.trunk.nStack = 20;
  this.trunk.eps1 = 1.8;
  this.trunk.eps2 = 1.5;
  this.trunk.middle = 0.6;;
  this.trunk.angle2 = 0;
  this.trunk.jStart = 6;
  this.trunk.type = 2;
  
  this.eyeL = new Rigid_HS();
  this.eyeL.kind = "SPHERE"//左目
  this.eyeL.diffuse = [0.3, 0.3, 0.6, 1.0];
  this.eyeL.ambient = [0.2, 0.2, 0.4, 1.0];
  this.eyeL.nSlice = 6;
  this.eyeL.nStack = 6;
  this.eyeL.vSize = new Vector3(0.1, 0.1, 0.1);
  
  this.eyeR = new Rigid_HS();
  this.eyeR.kind = "SPHERE"//右目
  this.eyeR.diffuse = [0.3, 0.3, 0.6, 1.0];
  this.eyeR.ambient = [0.2, 0.2, 0.4, 1.0];
  this.eyeR.nSlice = 6;
  this.eyeR.nStack = 6;
  this.eyeR.vSize = new Vector3(0.1, 0.1, 0.1);

  this.mouth = new Rigid_HS();
  this.mouth.kind = "SPHERE"//口
  this.mouth.diffuse = [0.5, 0.3, 0.3, 1.0];
  this.mouth.ambient = [0.4, 0.2, 0.2, 1.0];
  this.mouth.nSlice = 6;
  this.mouth.nStack = 6;
  this.mouth.vSize = new Vector3(0.2, 0.1, 0.1);

  this.tail = new Rigid_HS();
  this.tail.kind = "CYLINDER"//尾
  this.tail.diffuse = [0.2, 0.7, 0.9, 1.0];
  this.tail.ambient = [0.2, 0.6, 0.8, 1.0];
  this.tail.nSlice = 8;
  this.tail.nStack = 8;
  this.tail.radiusRatio = 0.2
  this.tail.vSize = new Vector3(0.05, 0.5, 0.4);

} 

Fish2.prototype.draw = function(gl)
{
  this.trunk.shadow = this.shadow;
  this.eyeL.shadow = this.shadow;
  this.eyeR.shadow = this.shadow;
  this.mouth.shadow = this.shadow;
  this.tail.shadow = this.shadow;
  
  //スタック行列の確保
  var stackMat = [];
  for(var i = 0; i < 2; i++) stackMat[i] = new Matrix4();
 
  var modelMatrix = new Matrix4(); //モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ

  //全体(root)
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  stackMat[0].copy(modelMatrix);//モデル行列を保存(ここまでのモデル行列は他のpaarts[]にも影響する)
  var n = this.trunk.initVertexBuffers(gl);
  this.trunk.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeLに影響するモデル行列をスタックからpop 
  //左目
  modelMatrix.translate(this.trunk.size1[0]*0.3, 0.0, this.trunk.size1[2]*0.8);//に平行移動
  modelMatrix.scale(this.eyeL.vSize.x, this.eyeL.vSize.y, this.eyeL.vSize.z);
  n = this.eyeL.initVertexBuffers(gl);
  this.eyeL.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //右目
  modelMatrix.translate(-this.trunk.size1[0]*0.3, 0.0, this.trunk.size1[2]*0.8);
  modelMatrix.scale(this.eyeR.vSize.x, this.eyeR.vSize.y, this.eyeR.vSize.z);
  n = this.eyeR.initVertexBuffers(gl);
  this.eyeR.draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//eyeRに影響するモデル行列をスタックからpop
  //口
  modelMatrix.translate(0, 0.0, this.trunk.size1[2]*0.95);
  modelMatrix.scale(this.mouth.vSize.x, this.mouth.vSize.y, this.mouth.vSize.z);
  n = this.mouth.initVertexBuffers(gl);
  this.mouth.draw(gl, n, modelMatrix);

  modelMatrix.copy(stackMat[0]);//tailに影響するモデル行列をスタックからpop
  //尾
  modelMatrix.rotate(this.trunk.angle2*0.5, 0, 1, 0);//尾びれを揺らす
  modelMatrix.translate(0, 0.0, -this.trunk.size2[2]*0.8);
  modelMatrix.scale(this.tail.vSize.x, this.tail.vSize.y, this.tail.vSize.z);
  modelMatrix.translate(0.0, 0.0, -this.tail.vSize.z/2);//中心位置を持ち上げる
  n = this.tail.initVertexBuffers(gl);
  this.tail.draw(gl, n, modelMatrix);

}

Fish2.prototype.motion = function(t)
{
  //左回り回転
  var theta0 = Math.atan2(this.vPos0.y , this.vPos0.x);
  var theta = 2*Math.PI * t / this.period + theta0;//x軸からの角度
  this.vPos.x = this.radius * Math.cos( theta );
  this.vPos.y = this.radius * Math.sin( theta ); 
  this.vEuler.x = 90;
  this.vEuler.y = this.angleZ;
  this.vEuler.z = 180 * theta / Math.PI + 180;//方向
  this.trunk.angle2 = this.maxAngSwing * Math.sin(2.0 * Math.PI * t / this.periodSwing);
}





