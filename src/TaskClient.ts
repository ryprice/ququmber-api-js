import {AxiosRequestConfig} from 'axios';
import * as qs from 'qs';

import authorizedRequest from 'listlab-api/authorizedRequest';
import CreatePublicTaskResponse from 'listlab-api/CreatePublicTaskResponse';
import FuzzyTime from 'listlab-api/fuzzyTime/FuzzyTime';
import {fuzzyTimeToRestJson} from 'listlab-api/fuzzyTime/fuzzyTimeSerialization';
import ListlabApiConfig from 'listlab-api/ListlabApiConfig';
import Payload from 'listlab-api/Payload';
import {restJsonToPayloadResult} from 'listlab-api/payloadSerialization';
import Task from 'listlab-api/Task';
import TaskCreationGroup from 'listlab-api/TaskCreationGroup';
import TaskFilter from 'listlab-api/TaskFilter';
import {taskFilterToRestJson} from 'listlab-api/taskFilterSerialization';
import TaskMutation from 'listlab-api/TaskMutation';
import {restJsonToTaskMutationResults} from 'listlab-api/TaskMutationResult';
import taskMutationToRestJson from 'listlab-api/taskMutationSerialization';
import {restJsonToTasks, taskToRestJson, restJsonToTaskDueOrders} from 'listlab-api/taskSerialization';
import TaskSortOrder from 'listlab-api/TaskSortOrder';
import RequestQueue from 'listlab-api/utils/RequestQueue';

type PostTaskParams = {
  parent?: number;
  before?: number;
  after?: number;
  orderType?: string;
  taskCreationGroupId?: number;
};

export default class TaskClient {

  private readonly config: ListlabApiConfig;

  private readonly taskServiceAddress: string;

  private readonly requestQueue: RequestQueue;

  constructor(config: ListlabApiConfig) {
    this.taskServiceAddress = config.TaskServiceAddress;
    this.config = config;
    this.requestQueue = new RequestQueue(this.config);
  }

  async getTaskDueOrders(dues: FuzzyTime[]) {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/dueorder?${dues
        .map(due => `due=${encodeURI(JSON.stringify(fuzzyTimeToRestJson(due)))}&`)
        .join('')
      }`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToTaskDueOrders(json);
  }

  async getTaskDetails(id: number): Promise<Payload> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/task/${id}/details`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToPayloadResult(json);
  }

  private preTasks: Task[] = [];

  async precreateTasks(): Promise<void> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/tasks/precreate`,
      method: 'POST'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    this.preTasks = this.preTasks.concat(restJsonToTasks(json));
  }

  getPreTask(): Task {
    if (this.preTasks.length < 4) {
      this.precreateTasks();
    }
    return this.preTasks.shift();
  }

  async search(query: string): Promise<Payload> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/search?q=${query}`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToPayloadResult(json);
  }

  async getTasksInFilter(filter: TaskFilter): Promise<Payload> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/tasks?${qs.stringify({
        filter: taskFilterToRestJson(filter)
      })}`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToPayloadResult(json);
  }

  async getTasks(args: {
    continuation: number,
    limit: number,
    sort?: TaskSortOrder,
  }) {
    const {continuation, sort, limit} = args;
    const data: any = {
      limit,
    };
    if (continuation) {
      data.continuation = continuation;
    }
    if (sort) {
      data.sort = sort;
    }
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/tasks?${qs.stringify(data)}`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToPayloadResult(json);
  }

  async postTask(task: Task, params?: PostTaskParams): Promise<Payload> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/task`,
      data: JSON.stringify({task: taskToRestJson(task), ...params}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST'
    };
    const json = await this.requestQueue.queue(ajaxSettings);
    return restJsonToPayloadResult(json);
  }

  postTasks(tasks: Task[], params?: PostTaskParams): void {
    for (const task of tasks) {
      this.postTask(task, params);
    }
  }

  async getTasksByIds(ids: number[]): Promise<Task[]> {
    if (ids.length < 1) {
      return Promise.resolve([]);
    }
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/tasks/byId?${ids.map(id => `id=${id}&`).join('')}`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToTasks(json);
  }

  async getTaskCreationGroups(taskCreationGroupIds: number[]): Promise<TaskCreationGroup[]> {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/taskcreationgroup?${taskCreationGroupIds.map(id => `id=${id}&`).join('')}`,
      method: 'GET'
    };
    const json = await authorizedRequest(this.config, ajaxSettings);
    return restJsonToPayloadResult(json).taskCreationGroups;
  }

  async sendMutations(mutations: TaskMutation[]) {
    const ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/mutate`,
      method: 'PUT',
      data: mutations.map(taskMutationToRestJson),
    };
    const mutationResults = await this.requestQueue.queue(ajaxSettings);
    return restJsonToTaskMutationResults(mutationResults);
  }

  async createPublicTask(newTask?: Task): Promise<CreatePublicTaskResponse> {
    let ajaxSettings: AxiosRequestConfig = {
      url: `${this.taskServiceAddress}/create-public`,
      method: 'POST',
    };
    if (newTask != null) {
      ajaxSettings = {
        ...ajaxSettings,
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify(taskToRestJson(newTask))
      };
    }
    const json = await authorizedRequest(this.config, ajaxSettings);
    return json as CreatePublicTaskResponse;
  }

  addRequestQueueListener(l: (isRunning: boolean) => void) {
    this.requestQueue.addListener(l);
  }

  removeRequestQueueListener(l: (isRunning: boolean) => void) {
    this.requestQueue.removeListener(l);
  }
}