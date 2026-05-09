export interface TabProps {
  user?: any;
  teamMembers?: any[];
  onUpdateUser?: (data: any) => void;
  onShowToast?: (message: string, type: string) => void;
}