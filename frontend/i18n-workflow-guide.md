# i18n Translation Workflow Guide

## Quick Start for Translators

### Adding New Translations

1. **Identify Missing Translations**
   - Check console warnings for missing translation keys
   - Look for hardcoded strings in components
   - Test the app in different languages

2. **Add Translation Keys**
   - Open the appropriate namespace file in `/src/locales/`
   - Add the same key to all language files
   - Use consistent naming conventions

3. **Test Your Changes**
   - Switch languages using the language switcher
   - Verify all text displays correctly
   - Check for proper formatting and spacing

### Translation Best Practices

#### DO:
- Use complete sentences
- Consider context and tone
- Test with real users
- Keep translations concise
- Use gender-neutral language
- Maintain consistent terminology
- Test UI layout for text length variations

#### DON'T:
- Translate literal word-for-word
- Use idioms that don't translate well
- Ignore cultural differences
- Forget to update all language files
- Use machine translation as final output
- Leave placeholder text
- Ignore formatting (dates, numbers, currency)

### Naming Conventions

#### Translation Keys
- Use dot notation: `namespace.category.item`
- Be descriptive but concise: `user.profile.updated`
- Group by feature: `resumes.upload.success`
- Use snake_case for consistency

#### Examples
```
✅ Good:
- auth.login.success
- errors.validation.email
- nav.items.dashboard
- forms.labels.password

❌ Bad:
- successMessage
- emailError
- dashboard
- passwordLabel
```

### Parameter Usage

#### Define Parameters in Translations
```json
{
  "welcome": "Welcome, {name}!",
  "itemsCount": "You have {count} {count, plural, one{item} other{items}}",
  "dateRange": "From {start} to {end}"
}
```

#### Use Parameters in Components
```tsx
const t = useTranslations('common');
t('welcome', { name: 'John' })
t('itemsCount', { count: 5 })
t('dateRange', { start: '2024-01-01', end: '2024-12-31' })
```

### Common Translation Patterns

#### Buttons
```json
{
  "submit": "Submit",
  "cancel": "Cancel",
  "confirm": "Confirm",
  "delete": "Delete",
  "edit": "Edit",
  "save": "Save"
}
```

#### Navigation
```json
{
  "home": "Home",
  "dashboard": "Dashboard",
  "settings": "Settings",
  "profile": "Profile"
}
```

#### Errors
```json
{
  "required": "This field is required",
  "invalid": "Invalid {field}",
  "notFound": "{resource} not found"
}
```

#### Success Messages
```json
{
  "created": "{resource} created successfully",
  "updated": "{resource} updated successfully",
  "deleted": "{resource} deleted successfully"
}
```

## Quality Assurance Checklist

### Before Submitting Translations
- [ ] All languages have the same translation keys
- [ ] No hardcoded strings remain in components
- [ ] All parameters are properly formatted
- [ ] Text displays correctly in UI (no overflow)
- [ ] Consistent terminology across all files
- [ ] Proper capitalization and punctuation
- [ ] Culturally appropriate content
- [ ] Tested in both languages

### Testing Checklist
- [ ] Home page displays correctly
- [ ] All navigation items are translated
- [ ] Forms show correct labels and errors
- [ ] Buttons use proper translations
- [ ] Error messages are localized
- [ ] Success messages are localized
- [ ] Date/number formatting works
- [ ] Language switching works smoothly

## Tools and Resources

### Development Tools
- **VS Code Extensions**: i18n Ally, String Manager
- **Browser DevTools**: Test language switching
- **Translation Platforms**: Lokalise, Crowdin (future)

### Helpful Resources
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [i18n Style Guides](https://www.w3.org/International/articles/controls-style-guide/)
- [Unicode CLDR](http://cldr.unicode.org/) - Locale data

## Troubleshooting

### Common Issues

**Translation not showing:**
1. Check if translation file exists
2. Verify namespace is correct
3. Check browser console for errors
4. Clear cache and reload

**Wrong language displayed:**
1. Check URL for locale prefix
2. Clear localStorage
3. Verify language detection
4. Check Accept-Language header

**Text overflow in UI:**
1. Test with longest translation
2. Use responsive design
3. Consider text expansion
4. Add proper truncation

## Getting Help

### Internal Resources
- Check `/docs/i18n-implementation-guide.md` for technical details
- Review existing translation files for patterns
- Ask team members for review

### External Resources
- next-intl GitHub discussions
- FastAPI documentation
- i18n community forums

## Continuous Improvement

### Regular Tasks
1. **Weekly**: Review new strings for translation
2. **Monthly**: Audit translation quality
3. **Quarterly**: User testing with native speakers
4. **Annually**: Comprehensive terminology review

### Feedback Loop
1. Collect user feedback on translations
2. Track translation-related issues
3. Review analytics for language usage
4. Prioritize improvements based on impact

Remember: Good translations require both linguistic skills and cultural understanding. When in doubt, consult with native speakers and professional translators.