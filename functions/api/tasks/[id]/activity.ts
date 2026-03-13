import { getData, success } from '../../_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const id = context.params.id as string;
  const task = data.taskDetails?.[id];
  return success(task?.activity || []);
};
