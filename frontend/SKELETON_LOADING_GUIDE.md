# Skeleton Loading Implementation Guide

## Overview

This guide explains the skeleton loading system implemented in the SyncHire application to improve perceived performance and user experience.

## Components

### Base Skeleton Component

**Location**: `/frontend/src/components/ui/skeleton.tsx`

The base `Skeleton` component provides the fundamental building block for all skeleton loaders:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Basic usage
<Skeleton className="h-4 w-32" />

// With variant
<Skeleton variant="circular" className="h-12 w-12" />
<Skeleton variant="rounded" className="h-9 w-24" />
```

**Props**:
- `className`: Additional CSS classes
- `variant`: Shape variant (`"default"` | `"circular"` | `"rounded"`)

### Specialized Skeleton Components

All specialized skeletons are located in `/frontend/src/components/skeleton/`:

1. **ResumeListSkeleton** - Loading state for resume listings
2. **JDListSkeleton** - Loading state for job description listings
3. **ApplicationListSkeleton** - Loading state for application listings
4. **DashboardStatsSkeleton** - Loading state for dashboard statistics
5. **SearchResultsSkeleton** - Loading state for search results
6. **ResumeEditorSkeleton** - Loading state for resume editor
7. **ResumePreviewSkeleton** - Loading state for resume preview
8. **AnalyticsSkeleton** - Loading state for analytics dashboard

### Custom Hooks

#### useSkeletonLoading

**Location**: `/frontend/src/hooks/use-skeleton-loading.ts`

Manages skeleton loading states with minimum display time to prevent flickering:

```tsx
const { isSkeletonVisible, startLoading, stopLoading } = useSkeletonLoading({
  minDisplayTime: 500, // Minimum time to show skeleton (ms)
  delay: 200, // Delay before showing skeleton (ms)
});

useEffect(() => {
  startLoading();
  fetchData().finally(stopLoading);
}, []);

return (
  <div>
    {isSkeletonVisible ? <MySkeleton /> : <Content />}
  </div>
);
```

#### useAsyncSkeleton

Wraps async operations with automatic skeleton state management:

```tsx
const { data, error, isSkeletonVisible, execute } = useAsyncSkeleton(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  { minDisplayTime: 500 }
);

useEffect(() => {
  execute();
}, []);

return (
  <div>
    {isSkeletonVisible ? <DataSkeleton /> : <DataDisplay data={data} />}
  </div>
);
```

## Design Requirements

### Shimmer Animation

The shimmer animation is implemented using CSS gradients and keyframes:

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
```

### Accessibility

All skeleton components include proper ARIA attributes:

- `role="status"` - Indicates the element's purpose
- `aria-label="Loading content"` - Describes what's happening
- `aria-busy="true"` - Indicates content is being loaded
- `aria-live="polite"` - Announces changes to screen readers
- `<span className="sr-only">` - Hidden text for screen readers

### Dark Mode Support

Skeletons automatically adapt to dark mode using Tailwind's dark mode modifiers:

```tsx
className="dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
```

### Responsive Design

Skeletons match the layout of actual content across all screen sizes:

```tsx
// Mobile: 2 columns, Desktop: 4 columns
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <DashboardStatsSkeleton />
</div>
```

## Integration Examples

### Dashboard Stats

```tsx
import { DashboardStatsSkeleton } from "@/components/skeleton";

function DashboardPage() {
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingStats(true);
      try {
        await fetchStats();
      } finally {
        setTimeout(() => setLoadingStats(false), 500);
      }
    };
    loadData();
  }, []);

  return (
    <div>
      {loadingStats ? <DashboardStatsSkeleton /> : <ActualStats />}
    </div>
  );
}
```

### Resume Editor

```tsx
import { ResumeEditorSkeleton } from "@/components/skeleton";

function ResumeEditor() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (currentResume?.content) {
      setInitialLoading(true);
      setContent(currentResume.content);
      setTimeout(() => setInitialLoading(false), 300);
    }
  }, [currentResume]);

  if (initialLoading) {
    return <ResumeEditorSkeleton />;
  }

  return <EditorContent />;
}
```

### Search Results

```tsx
import { SearchResultsSkeleton } from "@/components/skeleton";

function SearchPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const data = await searchApi(query);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <SearchResultsSkeleton />}
      {!loading && results.map(result => <ResultCard key={result.id} />)}
    </div>
  );
}
```

## Best Practices

### 1. Minimum Display Time

Always use a minimum display time to prevent flickering:

```tsx
setTimeout(() => setLoading(false), 500); // Minimum 500ms
```

### 2. Match Actual Layout

Skeletons should closely match the actual content layout:

```tsx
// Actual content
<div className="flex items-center gap-4">
  <img src={avatar} className="h-12 w-12 rounded-full" />
  <div>
    <h3 className="text-lg font-semibold">{name}</h3>
    <p className="text-sm text-gray-600">{email}</p>
  </div>
</div>

// Skeleton
<div className="flex items-center gap-4">
  <Skeleton variant="circular" className="h-12 w-12" />
  <div className="space-y-2">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-4 w-48" />
  </div>
</div>
```

### 3. Progressive Loading

Load content progressively when possible:

```tsx
{loadingStats ? (
  <DashboardStatsSkeleton />
) : (
  <ActualStats />
)}
{loadingContent ? (
  <ContentSkeleton />
) : (
  <ActualContent />
)}
```

### 4. Error Handling

Handle errors gracefully with skeleton states:

```tsx
{error ? (
  <ErrorMessage />
) : loading ? (
  <ContentSkeleton />
) : (
  <ActualContent />
)}
```

### 5. Accessibility First

Always include proper ARIA attributes:

```tsx
<div
  role="status"
  aria-label="Loading resumes"
  aria-busy="true"
>
  <ResumeListSkeleton />
  <span className="sr-only">Loading resume list...</span>
</div>
```

## Performance Considerations

### CSS vs JavaScript Animations

The shimmer effect uses CSS animations for better performance:

- **GPU Accelerated**: Uses `transform` and `opacity`
- **Non-blocking**: Doesn't block the main thread
- **Reduced Motion**: Respects `prefers-reduced-motion` media query

### Accessibility

The shimmer animation respects user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer {
    animation: none;
  }
}
```

### Bundle Size

Skeleton components are tree-shakeable:

```tsx
// Only import what you need
import { ResumeListSkeleton } from "@/components/skeleton";
```

## Testing

### Visual Regression Testing

Test skeleton components with visual regression tools:

```tsx
test('ResumeListSkeleton matches snapshot', () => {
  const { container } = render(<ResumeListSkeleton />);
  expect(container).toMatchSnapshot();
});
```

### Accessibility Testing

Verify ARIA attributes with testing libraries:

```tsx
test('ResumeListSkeleton has proper accessibility', () => {
  const { container } = render(<ResumeListSkeleton />);
  expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
});
```

## Troubleshooting

### Skeleton Not Showing

1. Check if loading state is properly set
2. Verify minimum display time isn't too short
3. Ensure skeleton component is properly imported

### Skeleton Flickering

1. Increase minimum display time
2. Add delay before showing skeleton
3. Use `useSkeletonLoading` hook for proper state management

### Layout Mismatch

1. Compare skeleton layout with actual content
2. Use same CSS classes for both skeleton and content
3. Test on different screen sizes

## Future Enhancements

Potential improvements to the skeleton system:

1. **Dynamic Skeletons**: Generate skeletons from component structure
2. **Skeleton Transitions**: Smooth fade-in/fade-out animations
3. **Skeleton Presets**: Pre-built skeletons for common patterns
4. **Skeleton Builder**: Tool to create custom skeletons visually
5. **Performance Monitoring**: Track skeleton display metrics

## Resources

- [Tailwind CSS Animation Documentation](https://tailwindcss.com/docs/animation)
- [ARIA Loading States Guide](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)
- [WebDev Skeleton Screens Article](https://web.dev/skeleton-screens/)
- [Material Design Loading States](https://material.io/components/progress-indicators)