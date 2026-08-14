import { decode, type JwtPayload } from "jsonwebtoken";
import type { Decoded } from "../../types/decoded.js";

type DecodedPayload = JwtPayload & {
  upn?: string;
  appid?: string;
  roles?: string[];
  oid?: string;
};

export function decodeAccessToken(auth: string | null | undefined): Decoded {
  const result: Decoded = {
    upn: "",
    appid: "",
    oid: "",
    verified: false,
    msg: "",
    roles: []
  };

  if (!auth) {
    result.msg = "Missing authorization header";
    return result;
  }

  let payload: JwtPayload | string | null;
  try {
    payload = decode(auth.replace("Bearer ", ""));
  } catch {
    result.msg = "Not a valid jwt";
    return result;
  }

  if (!payload || typeof payload === "string") {
    result.msg = "Not a valid jwt";
    return result;
  }

  const { upn, appid, roles, oid }: DecodedPayload = payload as DecodedPayload;
  if (!upn && !appid) {
    result.msg = "Missing upn or appId";
    return result;
  }

  result.appid = appid ?? "";
  result.upn = upn || "appReg";
  result.oid = oid ?? "";
  result.verified = true;
  result.roles = roles ?? [];

  return result;
}
