# Internationalization (i18n) Implementation Guide

## Overview

SyncHire now supports comprehensive internationalization (i18n) and localization (l10n) for both frontend and backend. The system currently supports English (en-US) and Chinese Simplified (zh-CN), with the infrastructure in place to easily add more languages.

## Frontend Implementation

### Architecture

The frontend uses [next-intl](https://next-intl-docs.vercel.app/) for internationalization, which provides:

- **Locale routing**: URLs like `/en/dashboard` and `/zh-CN/dashboard`
- **Type-safe translations**: Full TypeScript support
- **Automatic locale detection**: Based on browser preferences
- **Language switching**: Persistent user preferences
- **Nested namespaces**: Organized translation files

### Directory Structure

```
frontend/
├── src/
│   ├── i18n/
│   │   ├── request.ts          # Server-side translation config
│   │   ├── routing.ts          # Locale routing configuration
│   │   └── middleware.ts       # i18n middleware
│   ├── locales/
│   │   ├── en-US/
│   │   │   ├── common.json     # Common translations
│   │   │   ├── home.json       # Homepage translations
│   │   │   └── welcome.json    # Welcome banner translations
│   │   └── zh-CN/
│   │       ├── common.json     # Common translations (Chinese)
│   │       ├── home.json       # Homepage translations (Chinese)
│   │       └── welcome.json    # Welcome banner translations (Chinese)
│   ├── app/
│   │   └── [locale]/           # Locale-based routing
│   │       ├── layout.tsx
│   │       └── page.tsx
│   └── components/
│       └── language-switcher.tsx
```

### Using Translations in Components

```tsx
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common'); // or 'home', 'welcome', etc.

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

### Using Translations with Parameters

```json
// en-US/common.json
{
  "welcome": "Welcome, {name}!",
  "items": "You have {count} items"
}
```

```tsx
const t = useTranslations('common');
const message = t('welcome', { name: 'John' });
// "Welcome, John!"

const itemMessage = t('items', { count: 5 });
// "You have 5 items"
```

### Adding New Translations

1. **Create a new namespace file** (if needed):

```bash
# Create new translation files
touch src/locales/en-US/dashboard.json
touch src/locales/zh-CN/dashboard.json
```

2. **Add translations to both language files**:

```json
// en-US/dashboard.json
{
  "title": "Dashboard",
  "overview": "Overview",
  "statistics": "Statistics"
}

// zh-CN/dashboard.json
{
  "title": "控制台",
  "overview": "概览",
  "statistics": "统计数据"
}
```

3. **Use in your component**:

```tsx
import { useTranslations } from 'next-intl';

function Dashboard() {
  const t = useTranslations('dashboard');
  return <h1>{t('title')}</h1>;
}
```

### Language Switcher Component

The language switcher is available in the navigation bar:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher';

// In your layout or navigation
<LanguageSwitcher />
```

### URL Structure

- Default (Chinese): `/dashboard`
- English: `/en/dashboard`
- Chinese explicit: `/zh-CN/dashboard` (optional)

### Locale Detection

1. **Browser preference**: Checks `Accept-Language` header
2. **User preference**: Respects stored language preference
3. **URL prefix**: Uses locale from URL if present
4. **Default**: Falls back to `zh-CN` (Chinese)

## Backend Implementation

### Architecture

The backend uses a custom translation system with:

- **JSON-based translations**: Easy to edit and maintain
- **Middleware integration**: Automatic language detection
- **Context-aware translations**: Access in any endpoint
- **Type-safe**: Python type hints throughout

### Directory Structure

```
api/
├── app/
│   ├── i18n/
│   │   ├── __init__.py
│   │   ├── translations.py      # Translation manager
│   │   ├── middleware.py        # Language detection middleware
│   │   └── locales/
│   │       ├── en-US.json       # English translations
│   │       └── zh-CN.json       # Chinese translations
│   └── api/
│       └── i18n.py              # i18n API endpoints
```

### Using Translations in Endpoints

```python
from app.i18n import t, get_language
from fastapi import Request

@router.get("/endpoint")
async def my_endpoint(request: Request):
    language = get_language(request)

    # Get translation
    error_message = t("errors.required", language)
    # "This field is required" (en-US)
    # "此字段为必填项" (zh-CN)

    # With parameters
    welcome_msg = t("emails.greeting", language, name="John")
    # "Hello John" (en-US)
    # "您好 John" (zh-CN)

    return {"message": error_message}
```

### Adding New Backend Translations

1. **Edit translation files**:

```json
// api/app/i18n/locales/en-US.json
{
  "my_module": {
    "success": "Operation successful",
    "error": "Operation failed: {reason}"
  }
}

// api/app/i18n/locales/zh-CN.json
{
  "my_module": {
    "success": "操作成功",
    "error": "操作失败：{reason}"
  }
}
```

2. **Use in your code**:

```python
from app.i18n import t

# Get translation
message = t("my_module.success", language)

# With parameters
error = t("my_module.error", language, reason="Invalid input")
```

### API Endpoints

#### Get Available Languages

```http
GET /api/i18n/languages
```

Response:
```json
{
  "current_language": "en-US",
  "supported_languages": ["en-US", "zh-CN"],
  "default_language": "zh-CN"
}
```

#### Set User Language Preference

```http
POST /api/i18n/language
Content-Type: application/json

{
  "language": "en-US"
}
```

#### Get All Translations

```http
GET /api/i18n/translations?language=en-US
```

#### Get Specific Translation

```http
GET /api/i18n/translations/errors.required
```

## Adding a New Language

### Frontend

1. **Create translation files**:

```bash
mkdir -p src/locales/ja-JP
touch src/locales/ja-JP/common.json
touch src/locales/ja-JP/home.json
# ... other namespaces
```

2. **Add translations** (example for Japanese):

```json
// src/locales/ja-JP/common.json
{
  "app": {
    "name": "SyncHire",
    "tagline": "才能と出会いのプラットフォーム"
  },
  "common": {
    "submit": "送信",
    "cancel": "キャンセル",
    // ... more translations
  }
}
```

3. **Update routing configuration**:

```typescript
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en-US', 'zh-CN', 'ja-JP'], // Add new locale
  defaultLocale: 'zh-CN',
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      'en-US': '/en',
      'ja-JP': '/ja'  // Add prefix for new locale
    }
  }
});
```

4. **Update language switcher**:

```tsx
// src/components/language-switcher.tsx
const languages = [
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' }, // Add new language
];
```

### Backend

1. **Create translation file**:

```bash
touch api/app/i18n/locales/ja-JP.json
```

2. **Add translations**:

```json
// api/app/i18n/locales/ja-JP.json
{
  "errors": {
    "required": "この項目は必須です",
    "invalid_email": "有効なメールアドレスを入力してください"
  }
}
```

3. **Update supported languages**:

```python
# api/app/i18n/translations.py
SUPPORTED_LANGUAGES = ["en-US", "zh-CN", "ja-JP"]
```

## Best Practices

### Translation Keys

1. **Use dot notation** for nested keys: `errors.required`
2. **Be descriptive** but concise: `user.profile.updated` vs `updated`
3. **Group by feature/module**: `resumes.created`, `jobs.matched`
4. **Use consistent naming**: `snake_case` for backend, `camelCase` for frontend

### Translation Content

1. **Keep it simple**: Avoid complex grammar that doesn't translate well
2. **Use parameters** for dynamic content: `Welcome {name}` vs `Welcome John`
3. **Consider context**: The same word might need different translations in different contexts
4. **Test with real users**: Native speakers should review translations

### Technical Considerations

1. **Never concatenate translations**: Build complete sentences
2. **Handle missing translations**: Provide fallbacks
3. **Test all languages**: Before releasing changes
4. **Keep translations in sync**: When adding features, update all languages

## Testing

### Frontend Testing

```bash
# Test English version
npm run dev
# Visit http://localhost:3000/en

# Test Chinese version
# Visit http://localhost:3000 or http://localhost:3000/zh-CN
```

### Backend Testing

```bash
# Test language detection
curl -H "Accept-Language: en-US" http://localhost:8000/api/health
curl -H "Accept-Language: zh-CN" http://localhost:8000/api/health

# Test translations API
curl http://localhost:8000/api/i18n/languages
curl http://localhost:8000/api/i18n/translations?language=en-US
```

## Troubleshooting

### Common Issues

1. **Translations not showing**:
   - Check if translation files are in correct location
   - Verify locale codes match exactly
   - Check browser console for errors

2. **Wrong language displayed**:
   - Clear browser cache and localStorage
   - Check URL for locale prefix
   - Verify language detection logic

3. **Missing translations**:
   - Ensure all namespaces are loaded
   - Check for typos in translation keys
   - Verify translation files exist for all languages

### Debug Mode

Enable debug mode to see missing translations:

```typescript
// next.config.ts
export default {
  experimental: {
    missingTranslation: 'warning' // or 'error'
  }
}
```

## Maintenance

### Regular Tasks

1. **Review translations** quarterly for accuracy
2. **Add new languages** based on user demand
3. **Update translations** when features change
4. **Monitor translation coverage** across all languages

### Tools

Consider using translation management tools:
- **Crowdin**: For community translations
- **Lokalise**: For professional translation workflows
- **i18n-ally**: VS Code extension for developers

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [FastAPI i18n Best Practices](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Unicode CLDR: Locale Data](http://cldr.unicode.org/)
- [i18n Style Guides](https://www.w3.org/International/articles/controls-style-guide/)