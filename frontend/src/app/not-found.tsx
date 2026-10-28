import { EmptyState, Page } from '@/components/ui';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        title="Trang này không có trong thực đơn"
        description="Đường dẫn có thể đã thay đổi hoặc không tồn tại."
        action={{ label: 'Về trang chủ', href: '/' }}
      />
    </Page>
  );
}
