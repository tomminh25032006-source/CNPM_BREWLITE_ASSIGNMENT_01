import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <EmptyState
      title="Trang này không có trong thực đơn"
      description="Đường dẫn có thể đã thay đổi hoặc không tồn tại."
      action={{ label: 'Về thực đơn', href: '/' }}
    />
  );
}
