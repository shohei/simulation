//swgSpring.js

var MAX_SPRING = 360;
var numSpring = 1 ;

//enum SKind { S_SPRING, S_CYLINDER};

function Spring()
{
  //プロパティ
  this.kind = "SPRING";
  this.vPos = new Vector3();//位置(m)
  this.vEuler = new Vector3();//回転角度（オイラー角で指定,更新後）
  this.vSize = new Vector3(1.0, 1.0, 1.0);//スケーリング
  this.diffuse = [0.8, 0.8, 0.6, 1.0];
  this.ambient = [0.4, 0.4, 0.3, 1.0];
  this.specular = [0.8, 0.8, 0.8, 1.0];
  this.shininess = 100.0; 
  this.constK = 10;
  this.num1 = 10;      //分割数(Nm:主円周分割点数)
  this.num2 = 8;       //分割数(Ns:断面円周分割点数)
  this.num3 = 10;      //バネの巻き数
  this.radius = 0.03; //バネの主円周軸半径(実寸）
  this.length0 = 1;//バネの自然長
  this.length; //バネの長さ(自然長＋変位量)
  this.angle0; //springの角度（若い番号のspringとのなす角, rad）
//Vector vDir, vDir0;//vAngle0;
  //this.disp0;  //初期変位量
  this.ratio = 0.5;  //Torus,Spring(中心軸半径に対する断面半径比率
  //this.row1; this.col1, row2, col2, stk1, stk2;
  //this.n0, np1, np2, np = [];

  //hinge(2次元）
  this.num;   //hingeに隣接する質点のペア個数
  this.row = [];//hingeに隣接する質点の行番号
  this.col = [];//h = ingeに隣接する質点の列番号
  this stk = [];//hingeに隣接する質点の積番号
}

//-----------------------------------------------------------------
void CSpring::draw(bool flagShadow)
{
  
	static float shadowDiffuse[] = {0.2f,0.2f,0.2f,0.3f};//影の拡散光
	static float shadowSpecular[] = {0.0f,0.0f,0.0f,1.0f};//影の鏡面光

	//環境光と反射光はR,G,B同じ係数で指定されている
	static float diffuse[]  = {0.9, 0.9, 0.5, 1.0};
	static float ambient[]  = {0.5, 0.5, 0.2, 1.0};
	static float specular[] = {1.0, 1.0, 1.0, 1.0};

	if(flagShadow == false){
		glMaterialfv(GL_FRONT,GL_DIFFUSE, diffuse);
		glMaterialfv(GL_FRONT,GL_AMBIENT, ambient);
		glMaterialfv(GL_FRONT,GL_SPECULAR, specular);
		glMaterialf(GL_FRONT,GL_SHININESS, 100.0);
	}
	else{//影
		glMaterialfv(GL_FRONT,GL_AMBIENT_AND_DIFFUSE,shadowDiffuse);
		glMaterialfv(GL_FRONT,GL_SPECULAR,shadowSpecular);
	}

	glPushMatrix();

	if(kind == S_SPRING)
	{
		//現在位置
		glTranslated(vPos.x, vPos.y, vPos.z);//平行移動

		//回転
		glRotated(vEuler.z, 0.0, 0.0, 1.0);//z軸回転
		glRotated(vEuler.y, 0.0, 1.0, 0.0);//y軸回転
		glRotated(vEuler.x, 1.0, 0.0, 0.0);//x軸回転
	    
		drawSpring(num1, num2, num3, radius, ratio, length) ;
	}
	else if(kind == S_CYLINDER)
	{
		//円柱
		vSize.x = radius ;//円柱のサイズ
		vSize.y = radius ;
		vSize.z = length;
		//現在位置
		glTranslated(vPos.x, vPos.y, vPos.z);//平行移動

		//回転
		glRotated(vEuler.z, 0.0, 0.0, 1.0);//z軸回転
		glRotated(vEuler.y, 0.0, 1.0, 0.0);//y軸回転
		glRotated(vEuler.x, 1.0, 0.0, 0.0);//x軸回転

		//スケーリング
		glScaled(vSize.x, vSize.y, vSize.z);

		glCallList(cylinder);
	}
	glPopMatrix();
}

