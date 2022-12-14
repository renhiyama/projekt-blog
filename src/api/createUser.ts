import * as crypto from "node:crypto";
let generateID = function () {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
let generateAvatarURL = function () {
  //TODO: generate a random avatar url from getavataaars.com
  let accessoriesType = ["Blank", "Kurt", "Prescription01", "Prescription02", "Round", "Sunglasses", "Wayfarers"];
  let clotheType = ["BlazerShirt", "BlazerSweater", "CollarSweater", "GraphicShirt", "Hoodie", "Overall", "ShirtCrewNeck", "ShirtScoopNeck", "ShirtVNeck"];
  let eyeType = ["Close", "Cry", "Default", "Dizzy", "EyeRoll", "Happy", "Hearts", "Side", "Squint", "Surprised", "Wink", "WinkWacky"];
  let eyebrowType = ["Angry", "AngryNatural", "Default", "DefaultNatural", "FlatNatural", "RaisedExcited", "RaisedExcitedNatural", "SadConcerned", "SadConcernedNatural", "UnibrowNatural", "UpDown", "UpDownNatural"];
  let facialHairType = ["Blank", "BeardMedium", "BeardLight", "BeardMagestic", "MoustacheFancy", "MoustacheMagnum"];
  let hairColor = ["Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "PastelPink", "Platinum", "Red", "SilverGray"];
  let mouthType = ["Concerned", "Default", "Disbelief", "Eating", "Grimace", "Sad", "ScreamOpen", "Serious", "Smile", "Tongue", "Twinkle", "Vomit"];
  let skinColor = ["Tanned", "Yellow", "Pale", "Light", "Brown", "DarkBrown", "Black"];
  let topType = ["NoHair", "Eyepatch", "Hat", "Hijab", "Turban", "WinterHat1", "WinterHat2", "WinterHat3", "WinterHat4", "LongHairBigHair", "LongHairBob", "LongHairBun", "LongHairCurly", "LongHairCurvy", "LongHairDreads", "LongHairFrida", "LongHairFro", "LongHairFroBand", "LongHairNotTooLong", "LongHairShavedSides", "LongHairMiaWallace", "LongHairStraight", "LongHairStraight2", "LongHairStraightStrand", "ShortHairDreads01", "ShortHairDreads02", "ShortHairFrizzle", "ShortHairShaggyMullet", "ShortHairShortCurly", "ShortHairShortFlat", "ShortHairShortRound", "ShortHairShortWaved", "ShortHairSides", "ShortHairTheCaesar", "ShortHairTheCaesarSidePart"];
  let avatarURL = "https://avataaars.io/?avatarStyle=Circle&topType=" + topType[Math.floor(Math.random() * topType.length)] + "&accessoriesType=" + accessoriesType[Math.floor(Math.random() * accessoriesType.length)] + "&hairColor=" + hairColor[Math.floor(Math.random() * hairColor.length)] + "&facialHairType=" + facialHairType[Math.floor(Math.random() * facialHairType.length)] + "&clotheType=" + clotheType[Math.floor(Math.random() * clotheType.length)] + "&eyeType=" + eyeType[Math.floor(Math.random() * eyeType.length)] + "&eyebrowType=" + eyebrowType[Math.floor(Math.random() * eyebrowType.length)] + "&mouthType=" + mouthType[Math.floor(Math.random() * mouthType.length)] + "&skinColor=" + skinColor[Math.floor(Math.random() * skinColor.length)];
  return avatarURL;
}
export default async function (c, db) {
  //get the data from the request
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    
      return new Response(JSON.stringify({ success: false, error: "Parse Error" }), {
        status: 400,
      });
  }
  const { name, email, password } = body;
  console.log("Asking to create user", name, email, password)
  //create a new user
  if (!name || !email || !password) {
    return new Response(JSON.stringify({ success: false, error: "Missing data" }), {
      status: 400,
    });
  }
  //check if the user already exists
  let userExists = await db.query("SELECT * FROM user WHERE username = $name OR email = $email", {
    name, email
  });
  

  if (userExists[0].result.length > 0) {
    console.log(userExists);
    return new Response(JSON.stringify({ success: false, error: "User already exists" }), {
      status: 400,
    });
  }

  let salt = crypto.randomBytes(16).toString('hex');
  let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  let userCreated = await db.create("user", {
    username: name,
    id: "user-" + generateID(),
    email: email,
    salt: salt,
    hash: hash,
    avatarURL: generateAvatarURL(),
  });
  console.log(userCreated);
  //send the token to the user
  return new Response(JSON.stringify({ success: true, token: userCreated.hash }), {
    status: 200,
  });
}