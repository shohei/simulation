/*------------------------------------------------------------
            swgCollision.js
            剛体同士の衝突
--------------------------------------------------------------*/
var flagCollision = true;
var flagSeparate = false;
var awakeValue = 1;//覚醒させる運動量のしきい値

function collision(dt)
{
  var i, j;

  for(i = 0; i < numRigid; i++)
  {   
    rigid[i].action3D(dt);//放物運動(swgRigid.js)
//console.log(" i = " + i + "  state = " + rigid[i].state);
    if(!flagCollision) continue;//衝突判定せず
    for(j = 0; j < numRigid; j++)
    {
	  if(i == j) continue;
//console.log(" i = " + i + "  state = " + rigid[i].state + " j = " + j + "  state = " + rigid[j].state);
      //境界球で予備判定
	  var d = distance2(rigid[i].vPos, rigid[j].vPos);//2乗距離
	  var a = rigid[i].boundingR + rigid[j].boundingR;
      if(d > a*a) continue;

      collisionWithRigid(i, j, dt);
    }
  }	

  //強制引き離し  
  var distEnforce = 0.2;//引き離す距離
  var vDir = new Vector3();
  for(i = 0; i < numRigid; i++)
  { 
	if(flagSeparate)
	{
      //強制引き離し(x,y,z方向のサイズが同程度でなければ利用不可）
	  for(j = 0; j < numRigid; j++)
	  {
		var a = (rigid[i].vSize.x + rigid[j].vSize.x)/2;
		var d = distance(rigid[i].vPos, rigid[j].vPos);//中心間距離
		if(d < 0.2) vDir = new Vector3(1.0, 1.0, 0.0);//深くめり込んだ場合
		else vDir = direction(rigid[i].vPos , rigid[j].vPos);
		if(d < a)
		{
 	      rigid[i].vPos.sub(mul(distEnforce, vDir));
		  rigid[j].vPos.add(mul(distEnforce, vDir));
		}
	  }
	}
  }
}

//--------------------------------------------------------------------------
function collisionWithRigid(i, j, dt)
{
  var rikiseki;
  var vn1, vn2;//法線成分の大きさ
  var muc,B, m1, m2;
  var vVelocityP1, vVelocityP2;//合成速度
  var vTangential;//接線方向
  var vDir = new Vector3();
  var vA1 = new Vector3();
  var vA2 = new Vector3();
  var vPos1 = new Vector3();
  var vPos2 = new Vector3();
  var vRg1 = new Vector3();
  var vRg2 = new Vector3();
  
  var depth = checkCollision(i, j);//衝突判定

  if(depth < 0.0) return;
  rigid[i].vForce = new Vector3();
  rigid[i].vTorque = new Vector3();
  rigid[j].vForce = new Vector3();
  rigid[j].vTorque = new Vector3();

  vRg1.copy(rigid[i].vGravityToPoint);
  vRg2.copy(rigid[j].vGravityToPoint);
  m1 = rigid[i].mass;
  m2 = rigid[j].mass;

  vVelocityP1 = add(rigid[i].vVel , cross(rigid[i].vOmega, vRg1));
  vn1 = dot(vVelocityP1, rigid[i].vNormal);
  vVelocityP2 = add(rigid[j].vVel , cross(rigid[j].vOmega, vRg2));
  vn2 = dot(vVelocityP2, rigid[i].vNormal);

  //衝突応答
  vTangential = cross( rigid[i].vNormal, cross(sub(vVelocityP1, vVelocityP2), rigid[i].vNormal));
  vTangential.norm();
  //力積
  rikiseki = - (restitution + 1.0) * (vn1 - vn2) / (1.0/m1 + 1.0/m2
          + dot(rigid[i].vNormal , cross(mulMV(rigid[i].mInertiaInverse, cross(vRg1, rigid[i].vNormal)), vRg1))
          + dot(rigid[i].vNormal , cross(mulMV(rigid[j].mInertiaInverse, cross(vRg2, rigid[i].vNormal)), vRg2)));
  //強い運動量を受けたとき覚醒
  if(Math.abs(rikiseki) >  awakeValue)
  {
    rigid[i].state = "FREE";
    rigid[j].state = "FREE";
  }

  //力の総和
  rigid[i].vForce.add(mul(rigid[i].vNormal , rikiseki / dt));
  rigid[j].vForce.sub(mul(rigid[i].vNormal , rikiseki / dt));
  //力のモーメント（トルク）の総和
  rigid[i].vTorque.add(mul(cross(vRg1, rigid[i].vNormal) , rikiseki / dt));
  rigid[j].vTorque.sub(mul(cross(vRg2, rigid[i].vNormal) , rikiseki / dt));

  //摩擦を考慮
  vA1 = cross(mulMV(rigid[i].mInertiaInverse , cross(vRg1, vTangential)) , vRg1);
  vA2 = cross(mulMV(rigid[j].mInertiaInverse , cross(vRg2, vTangential)) , vRg2);
  B = - dot(vTangential, sub(vVelocityP1, vVelocityP2)) / (1.0/m1+1.0/m2+ dot(vTangential,add(vA1, vA2)));
  muc = Math.abs(B / rikiseki);
  if(muK >= muc)
  {
    rigid[i].vForce.add(vTangential, B / dt);
    rigid[i].vTorque.add(mul(cross(vRg1, vTangential) , B / dt));
    rigid[j].vForce.sub(mul(vTangential, B / dt));
    rigid[j].vTorque.sub(mul(cross(vRg2, vTangential) , B / dt));
  }
  else
  {
    rigid[i].vForce.add(mul( muK * rikiseki / dt , vTangential));
	rigid[i].vTorque.add(mul(cross(vRg1, vTangential) , muK * rikiseki / dt));
	rigid[j].vForce.sub(mul(muK * rikiseki / dt , vTangential));
	rigid[j].vTorque.sub(mul(cross(vRg2, vTangential) , muK * rikiseki / dt));
  }

  //位置回転角度の更新
  if(rigid[i].state== "FREE")// || rigid[i].state== "FREE_ON_FLOOR" )
  {
    // i番目の剛体
    //衝突時にめり込んだ分引き離す
    rigid[i].vPos.sub(mul(depth/2.0+0.01 , rigid[i].vNormal));//0.01は分離を確実にするため				
    rigid[i].vAcc = div(rigid[i].vForce , m1); //加速度
    rigid[i].vVel.add(mul(rigid[i].vAcc , dt));//速度
    rigid[i].vAlpha = mulMV(rigid[i].mInertiaInverse , rigid[i].vTorque);//角加速度の更新
    rigid[i].vOmega.add(mul(rigid[i].vAlpha , dt));          //角速度
  }
  if(rigid[j].state== "FREE")// || rigid[j].state== "FREE_ON_FLOOR" )
  { 
    // j番の剛体
    //衝突時にめり込んだ分引き離す
    rigid[j].vPos.add(mul(depth/2.0+0.01 , rigid[i].vNormal));
    rigid[j].vAcc = div(rigid[j].vForce , m2);
    rigid[j].vVel.add(mul(rigid[j].vAcc , dt));
    rigid[j].vAlpha = mulMV(rigid[j].mInertiaInverse , rigid[j].vTorque);
    rigid[j].vOmega.add(mul(rigid[j].vAlpha , dt));
  }
}
//--------------------------------------------------------------------------------------------
//衝突があれば衝突時の深さdepthを返す。
//depthが負のときは非衝突である
function checkCollision(i, j)
{
  var depth;
    
  if(rigid[i].kind == "SPHERE")
  {
    switch(rigid[j].kind ) 
    {
      case "SPHERE"://球同士
        depth = rigid[i].collisionSphereWithSphere(rigid[j]);
        return depth;
		break;

      case "CUBE":
        depth = rigid[i].collisionSphereWithCube(rigid[j]);
        if(depth >= 0.0) return depth;
        depth = rigid[j].collisionCubeWithSphere(rigid[i]);
        if(depth >= 0.0) rigid[i].vNormal.reverse();
        return depth;
        break;
      case "CYLINDER"://円柱
        depth = rigid[i].collisionSphereWithCylinder(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionCylinderWithSphere(rigid[i]);
		if(depth >= 0.0) rigid[i].vNormal.reverse();
		return depth;
		break;
    }
  }

  else if(rigid[i].kind == "CUBE")
  {
    switch(rigid[j].kind)
    {
	  case "SPHERE":
	    depth = rigid[i].collisionCubeWithSphere(rigid[j]);
//console.log("BBB depth = " + depth + " x=" + rigid[i].vNormal.x + " y=" + rigid[i].vNormal.y + " z=" + rigid[i].vNormal.z);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionSphereWithCube(rigid[i]);
		if(depth >= 0.0) rigid[i].vNormal.reverse();
//console.log("CCC depth = " + depth + " x=" + rigid[i].vNormal.x + " y=" + rigid[i].vNormal.y + " z=" + rigid[i].vNormal.z);
		return depth;
		break;
      case "CUBE":
        depth = rigid[i].collisionCubeWithCube(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionCubeWithCube(rigid[i]);
		if(depth >= 0.0) rigid[i].vNormal.reverse();
		return depth;
		break;
      case "CYLINDER"://円柱
        depth = rigid[i].collisionCubeWithCylinder(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionCylinderWithCube(rigid[i]);
		if(depth >= 0.0) rigid[i].vNormal.reverse();
		return depth; 
		break;
    }
  }

  else if(rigid[i].kind == "CYLINDER")//円柱
  {
    switch(rigid[j].kind)
    {
	  case "SPHERE":
	    depth = rigid[i].collisionCylinderWithSphere(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionSphereWithCylinder(rigid[i]);
		rigid[i].vNormal.reverse();
		return depth;
		break;
      case "CUBE":
 		depth = rigid[i].collisionCylinderWithCube(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionCubeWithCylinder(rigid[i]);
		rigid[i].vNormal.reverse();
		return depth;
		break;
      case "CYLINDER"://円柱同士
        depth = rigid[i].collisionCylinderWithCylinder(rigid[j]);
		if(depth >= 0.0) return depth;
		depth = rigid[j].collisionCylinderWithCylinder(rigid[i]);
		if(depth >= 0.0) rigid[i].vNormal.reverse();
		return depth;
        break;
    }
  }
  return NON_COLLISION;
}
