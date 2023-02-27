import { PATH } from './model/PATH.js';
import Config from './model/Config.js';
import { getStrLen, recurGetJsPath } from './model/misc.js';

// 格式化版本信息
const verData = await Config.getConfig('', 'version');
let curVer = verData.current.version;
const curVerLength = getStrLen(curVer);
if (curVerLength < 18) curVer = ` ${curVer} `; // 加中部空格
const verLog = `[赛事排表]${curVer}载入中~`;

// 格式化所有信息
const logsInfo = ['本插件基于Yunzai-Bot-V3运行', `${verLog}`, '作者RetuEase', '联系方式(QQ): 3573414538'].map(
  logInfo => {
    const infoLength = getStrLen(logInfo);
    const restLength = 36 - infoLength;
    if (restLength) {
      logInfo = logInfo
        .padEnd(logInfo.length + Math.ceil(restLength / 2), ' ')
        .padStart(logInfo.length + restLength, ' '); // 加前部空格
    }
    return logInfo;
  }
);

// 输出信息，两竖线间字符串长度为36
logger.info(`=-=-=-=-=-=-=-=赛事排表=-=-=-=-=-=-=-=`);
logsInfo.forEach(logInfo => logger.info(`|${logInfo}|`));

/** <<<<<<<<<<<<<<导入apps>>>>>>>>>>>>>> */
const apps = {};
const appPathArr = recurGetJsPath(PATH.apps).map(path => path.replace(PATH.root, '.'));

if (appPathArr) {
  const appLoadArrRaw = appPathArr.map(appPath => import(appPath));
  (await Promise.allSettled(appLoadArrRaw)).forEach((appLoad, i) => {
    const jsName = appPathArr[i].split('/').at(-1).replace('.js', '');

    if (appLoad.status === 'fulfilled') {
      apps[jsName] = appLoad.value[jsName];
    } else {
      logger.error(`载入js文件错误：${appPathArr[i]}`);
      logger.error(appLoad.reason);
    }
  });
} else logger.error(`载入插件错误：读取apps文件夹失败`);

// 将接口发送给云崽
export { apps };

logger.info(`---------------赛事排表---------------`);
