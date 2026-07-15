import crypto from "crypto";

export function verifyInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) return false;
    
    urlParams.delete("hash");
    
    const dataToCheck: string[] = [];
    urlParams.sort();
    urlParams.forEach((value, key) => {
      dataToCheck.push(`${key}=${value}`);
    });
    const dataCheckString = dataToCheck.join("\n");
    
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    
    return calculatedHash === hash;
  } catch (error) {
    console.error("Error verifying initData:", error);
    return false;
  }
}

export function parseInitData(initData: string): any {
  if (!initData) return null;
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error parsing initData:", error);
    return null;
  }
}
