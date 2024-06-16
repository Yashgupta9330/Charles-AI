import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import { join } from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const config = {
api: {
bodyParser: false,
},
};

function fileToGenerativePart(filePath: string, mimeType: string) {
return {
inlineData: {
data: fs.readFileSync(filePath).toString("base64"),
mimeType,
},
};
}

const processImage = async (filePath: string) => {
const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
const image = fileToGenerativePart(filePath, "image/png");

const descriptionPrompt = `Describe this UI in accurate details. When you reference a UI element put its name and bounding box in the format: [object name (y_min, x_min, y_max, x_max)]. Also Describe the color of the elements.`;
const descriptionResponse = await model.generateContent([descriptionPrompt, image]);
const description = descriptionResponse.response.text();

const refineDescriptionPrompt = `Compare the described UI elements with the provided image and identify any missing elements or inaccuracies. Also Describe the color of the elements. Provide a refined and accurate description of the UI elements based on this comparison. Here is the initial description: ${description}`;
const refineDescriptionResponse = await model.generateContent([refineDescriptionPrompt, image]);
const refinedDescription = refineDescriptionResponse.response.text();

const htmlPrompt = `Create an HTML file based on the following UI description, using the UI elements described in the previous response. Include inline CSS within the HTML file to style the elements. Make sure the colors used are the same as the original UI. The UI needs to be responsive and mobile-first, matching the original UI as closely as possible. Do not include any explanations or comments. Avoid using \`\`\`html. and \`\`\` at the end. ONLY return the HTML code with inline CSS. Here is the refined description: ${refinedDescription}`;
const initialHtmlResponse = await model.generateContent([htmlPrompt, image]);
const initialHtml = initialHtmlResponse.response.text();

const refineHtmlPrompt = `Validate the following HTML code based on the UI description and image and provide a refined version of the HTML code with inline CSS that improves accuracy, responsiveness, and adherence to the original design. ONLY return the refined HTML code with inline CSS. Avoid using \`\`\`html. and \`\`\` at the end. Here is the initial HTML: ${initialHtml}`;
const refinedHtmlResponse = await model.generateContent([refineHtmlPrompt, image]);
const refinedHtml = refinedHtmlResponse.response.text();

return {
description,
refinedDescription,
initialHtml,
refinedHtml,
};
};

export async function POST(req: Request) {
console.log("Started processing");

const { userId } = auth();
if (!userId) {
return new NextResponse("Unauthorized", { status: 401 });
}

if (!process.env.GEMINI_API_KEY) {
return new NextResponse("Google Generative AI API Key not configured.", { status: 500 });
}

try {
const data = await req.formData();
const file: File | null = data.get('file') as unknown as File;
console.log("Request with file", file);
const bytes = await file.arrayBuffer();
const buffer = Buffer.from(bytes);
const filePath = join('/', 'tmp', file.name);

await fs.promises.writeFile(filePath, buffer);
console.log(`Saved file to ${filePath}`);

const results = await processImage(filePath);
console.log("Processing results", results);

// Clean up the temporary file
await fs.promises.unlink(filePath);

return NextResponse.json(results);
} catch (error) {
  console.error('[CODE_ERROR]', error);
  return new NextResponse("Internal Error", { status: 500 });
  }
 }