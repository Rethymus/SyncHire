# 前端表单约定：react-hook-form + zod

新表单一律使用 react-hook-form（RHF）+ zod，不再新增 useState 逐字段 + 手动校验的手写表单。
参照实现（schema / resolver / UI 三段式的真实代码）：

- 组件：`frontend/src/components/job-source-add-form.tsx`（岗位数据源页的"添加数据源"表单）
- 页面接入：`frontend/src/app/job-sources/page.tsx`
- 单测：`frontend/src/components/__tests__/job-source-add-form.test.tsx`

## 何时用 RHF + zod

- 表单有 2 个以上输入字段，或需要任何校验（必填、格式、长度、联动）→ 用 RHF + zod。
- 单输入且无校验（如搜索框、粘贴扫描框）→ 继续 useState，不值得引入表单状态。
- 核心链路的存量表单（jd-input、application-create-dialog）不主动迁移，见"共存策略"。

## 最小骨架：三段式

以参照实现为准，三段缺一不可：

1. **schema（随 locale 重建）**：schema 工厂接收消息文案，`useMemo` 按 locale 重建，消息不写死在 schema 里：

   ```tsx
   const messages = LITE_COPY[locale].formValidation;
   const schema = useMemo(
     () =>
       z.object({
         url: z.string().min(1, messages.required).url(messages.invalidUrl),
         name: z.string().optional(),
       }),
     [messages]
   );
   ```

2. **resolver（useForm 接线）**：`zodResolver` 来自 `@hookform/resolvers/zod`（v5，兼容 zod v4），
   `defaultValues` 必须显式给出，类型用 `z.input<typeof schema>`：

   ```tsx
   const { register, handleSubmit, reset, formState: { errors } } =
     useForm<z.input<typeof schema>>({
       resolver: zodResolver(schema),
       defaultValues: { url: "", name: "" },
     });
   ```

3. **UI（register + 错误展示）**：input 展开 `{...register("url")}`，错误用现有视觉语言
   （红色小字）+ 无障碍属性；`noValidate` 关掉浏览器原生校验，统一由 zod 出消息：

   ```tsx
   <input
     id="job-source-url"
     type="url"
     aria-invalid={urlError ? true : undefined}
     aria-describedby={urlError ? "job-source-url-error" : undefined}
     {...register("url")}
   />
   {urlError && (
     <p id="job-source-url-error" role="alert" className="mt-1 text-xs text-red-600">
       {urlError}
     </p>
   )}
   ```

提交语义：`onSubmit={handleSubmit(async (values) => { ... })}`。
成功后在回调 resolve 之后 `reset(...)` 清空；回调 reject 则保留已填值供重试（参照实现里有 try/catch 示例）。
异步进行中用 `busy` prop 禁用提交按钮，busy 状态归页面管（页面可能多处共享）。

## 错误消息双语模式

- 校验消息统一走 `frontend/src/lib/lite-i18n.ts` 的 `LITE_COPY.formValidation`
  （现有键：`required`、`invalidUrl`）。schema 通过工厂函数注入这些消息，**禁止**在 schema 里写死英文
  （存量 `interview-scheduling-form.tsx` 即此问题，勿模仿）。
- 需要新消息键时：在 `formValidation` 下新增，`en-US` 与 `zh-CN` 两份都要加，文案克制、可跨表单复用。
- 表单自身的 UI 文案（placeholder、按钮等）沿用组件内 `COPY[locale]` 局部映射（同参照实现），
  不必全部塞进 LITE_COPY。

## 与现有手写表单共存策略

- **被触碰才迁移**：只为改需求而顺手迁移，不为统一而统一；迁移必须保持行为等价
  （成功路径的 store/API 调用、取消/清空逻辑、文案逐字保留）。
- 迁移时把表单抽成独立组件（如 `job-source-add-form.tsx`），页面只保留数据获取、
  notice/error 横幅与 `busy` 状态；表单校验通过后调用 `onAdd(values)` 回调。
- 唯一允许的行为差异：原先"输入为空时禁用按钮"可改为"可点击、提交时报双语错误"——
  拦截结果等价，但错误可见、可测试。其余交互不得变更。

## lint / 测试要求

- `npm run type-check` 零错误；新改文件 ESLint 无告警。
- 每个迁移后的表单组件配 vitest + RTL 测试，放在 `src/components/__tests__/`，至少覆盖：
  1. 合法提交触发回调且成功后重置；
  2. 必填缺失出双语错误（`localStorage.setItem("synchire-lite-locale", "zh-CN")` 切语言断言中文文案）；
  3. 格式错误（如 URL）出对应文案；
  4. 异常路径（回调 reject 保留已填值）与 busy 禁用。
- 无障碍断言随测试带上：错误节点 `role="alert"`、输入 `aria-invalid` / `aria-describedby`。

## 依赖版本备注

zod 为 v4：`z.string().min(1, "msg")`、`.url("msg")` 等基础 API 与 v3 一致；
消息参数传字符串即可。`@hookform/resolvers` v5 的 `zodResolver` 原生支持 zod v4。
