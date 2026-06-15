/**
 * Portrait / business-headshot prompt builder.
 *
 * Generates a LinkedIn-style professional business headshot from a user's
 * everyday photo via an image model. The text fields (name / title /
 * department) are rendered onto the image; per the product rule, any Chinese
 * input is auto-translated to formal English on the image.
 */

/** Selectable ID-photo background colors. */
export type PortraitBackgroundId = "white" | "blue" | "red";

export interface PortraitBackgroundOption {
  id: PortraitBackgroundId;
  /** Short color name, e.g. "白色". */
  label: string;
  /** Suitable-use scenario annotation shown in the UI dropdown. */
  scenario: string;
  /** Background clause injected into the generation prompt (replaces the
   * default white clause when a non-white color is chosen). */
  prompt: string;
}

/**
 * Common Chinese ID-photo background colors with their conventional use cases.
 * Conventions sourced from common practice; always confirm the receiving
 * institution's specific requirement before submitting.
 */
export const PORTRAIT_BACKGROUND_OPTIONS: PortraitBackgroundOption[] = [
  {
    id: "white",
    label: "白色",
    scenario: "护照、签证、身份证件、学位证、外企 / 跨国公司简历",
    prompt: "背景为纯白色素色背景",
  },
  {
    id: "blue",
    label: "蓝色",
    scenario: "毕业证、学位证、简历照、工作证、求职",
    prompt: "背景为标准证件照蓝色背景（约 #438EDB）",
  },
  {
    id: "red",
    label: "红色",
    scenario: "党员证、医保卡、保险卡、结婚登记照",
    prompt: "背景为证件照红色背景（约 #D9001B）",
  },
];

export const DEFAULT_PORTRAIT_BACKGROUND_ID: PortraitBackgroundId = "white";

/** The default white-background clause inside PORTRAIT_PROMPT_TEMPLATE. */
const DEFAULT_WHITE_CLAUSE = "背景为纯白色素色背景";

export interface PortraitDetails {
  name: string;
  title: string;
  department: string;
  /** Optional background color; defaults to white when omitted. */
  backgroundId?: PortraitBackgroundId;
}

/** The master prompt template (zh description of the desired business headshot). */
export const PORTRAIT_PROMPT_TEMPLATE = `请基于我上传的人像照片生成一张正式商务档案头像海报。保留人物真实身份特征、五官比例、脸型基础和整体气质，不要改变人物身份。可以适度优化面部轮廓，使脸部线条更清晰、自然、上镜；平滑皮肤质感，减少瑕疵、暗沉和肤色不均，但不要过度磨皮，保留真实皮肤细节和自然光影。请根据人物脸型设计一款匹配的商务发型。发型应干净利落、成熟专业、适合正式场合，发丝自然、有层次，不夸张。请为人物搭配正式商务穿搭，例如深色西装外套、白色或浅色衬衫，可搭配领带。整体造型应高级、简洁、专业、可信赖。画面为正面半身肖像，人物居中，直视镜头，表情自然自信。背景为纯白色素色背景，光线柔和均匀，类似专业证件照、企业头像摄影或大学官网个人档案照。整体风格干净、正式、商务、高清写实摄影质感，方形比例 1:1。画面下方预留简洁信息栏，并添加现代简洁排版文字。重要文字规则：如果用户输入的姓名、身份、职位、专业、部门、机构或其他需要显示在图片上的文字是中文或其他语言，请先将这些内容翻译成自然、准确、正式的英文，再放入图片中。除非用户明确要求保留中文，否则图片中不要显示中文文字。排版要求：第一行姓名使用深蓝色粗体大字号英文文字；第二行和第三行使用黑色常规字号英文文字。整体排版参考大学官网个人档案、学术会议人物介绍卡片或专业商务头像海报风格。`;

function resolveBackground(id?: PortraitBackgroundId): PortraitBackgroundOption {
  return (
    PORTRAIT_BACKGROUND_OPTIONS.find((o) => o.id === id) ??
    PORTRAIT_BACKGROUND_OPTIONS[0]
  );
}

/**
 * Build the final prompt, injecting the user's name / title / department and
 * the selected background color, while keeping the global style + CN→EN rule.
 * White (the default) keeps the raw template; blue/red replace the white
 * background clause with the chosen color.
 */
export function buildPortraitPrompt(details: PortraitDetails): string {
  const name = details.name.trim();
  const title = details.title.trim();
  const department = details.department.trim();

  const background = resolveBackground(details.backgroundId);
  let base = PORTRAIT_PROMPT_TEMPLATE;
  if (background.id !== DEFAULT_PORTRAIT_BACKGROUND_ID) {
    base = base.replace(DEFAULT_WHITE_CLAUSE, background.prompt);
  }

  const infoBar: string[] = [];
  if (name) infoBar.push(`姓名：[${name}]`);
  if (title) infoBar.push(`职位：[${title}]`);
  if (department) infoBar.push(`部门：[${department}]`);

  const infoSpec = infoBar.length
    ? `画面下方信息栏需要显示以下内容（务必遵循前述"中文自动翻译为正式英文"规则）：\n${infoBar.join("\n")}`
    : "画面下方信息栏留白，仅保留版式，不显示具体文字。";

  return `${base}\n\n${infoSpec}`;
}
