import { getData, success } from '../_data';
export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  return success(data.notificationStats || { unreadCount: 0, totalCount: 0, byType: {}, byPriority: {} });
};
