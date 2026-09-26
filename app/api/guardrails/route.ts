import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { planSchema } from "../../../lib/guardrails/model";
import { guardrailState } from "../../../lib/guardrails/store";
import { z } from "zod";
const changeSchema=z.object({plan:planSchema,expectedRevisionId:z.string().uuid().nullable()});
export async function GET() {
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)return Response.json({error:"Sign in to view saved guardrails."},{status:401});
  try{return Response.json(await guardrailState(session.user.id),{headers:{"Cache-Control":"private, no-store"}});}
  catch{return Response.json({error:"Saved guardrails are unavailable. Check the database migration and covered demo files."},{status:503});}
}
export async function POST(request:Request) {
  if(request.headers.get("origin")!==new URL(process.env.APP_URL??request.url).origin)return Response.json({error:"Invalid request origin."},{status:403});
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)return Response.json({error:"Sign in to save guardrails."},{status:401});
  const parsed=changeSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message??"Check your settings."},{status:400});
  try{return Response.json(await guardrailState(session.user.id,parsed.data),{headers:{"Cache-Control":"private, no-store"}});}
  catch(error){
    const message=error instanceof Error?error.message:"";
    if(message==="CONFLICT")return Response.json({error:"Your plan changed in another tab. Reload before saving."},{status:409});
    if(message.startsWith("The baseline")||message.startsWith("The original")||message.startsWith("Choose a baseline"))return Response.json({error:message},{status:400});
    return Response.json({error:"Could not save your plan. Check the connection and try again."},{status:503});
  }
}
