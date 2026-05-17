import PageContainer from '@/components/layout/page-container';
import DepartmentListingPage from '@/features/departments/components/department-listing';
import { departmentsInfoContent } from '@/features/departments/info-content';
import { DepartmentFormSheetTrigger } from '@/features/departments/components/DepartmentFormSheetTrigger';

export const metadata = {
  title: 'Dashboard: Departments'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Departments'
      pageDescription='Manage university departments. Departments belong to faculties and contain related programs.'
      infoContent={departmentsInfoContent}
      pageHeaderAction={<DepartmentFormSheetTrigger />}
    >
      <DepartmentListingPage />
    </PageContainer>
  );
}
