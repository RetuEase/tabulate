import plugin from '../../../lib/plugins/plugin.js';
import { table } from './table.js';
import { ch2Num } from '../model/misc.js';

export class round extends plugin {
  constructor() {
    super({
      name: 'round',
      dsc: '轮次命令',
      priority: 50,
      rule: [
        {
          reg: '.*? vs .*',
          fnc: 'registerBattle',
        },
        {
          reg: /^#记录 .*? \d\d?$/,
          fnc: 'recordBattle',
        },
        {
          reg: '^#下一轮$',
          fnc: 'nextTurn',
        },
        {
          reg: '^#切换第.*?轮$',
          fnc: 'selectTurn',
        },
      ],
    });
  }

  async registerBattle(e) {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);
    const curRound = await redis.get('tabulate.round');

    const battleName = e.msg.trim();

    const [player0, player1] = battleName.split(' vs ').map(pn => pn.trim());
    curTable.记录[curRound].push({
      leftName: player0,
      leftPoint: '?',
      rightName: player1,
      rightPoint: '?',
    });
    await redis.set('tabulate.table', JSON.stringify(curTable));

    return await new table().tabSee(e);
  }

  async recordBattle(e) {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);
    const curRound = await redis.get('tabulate.round');

    const battleMsg = e.msg.replace(/^#记录 /, '').trim();

    const [fixedPlayer, rate] = battleMsg.split(' ').map(bm => bm.trim());
    const leftIndex = curTable.记录[curRound].findIndex(battle => battle.leftName === fixedPlayer);
    const rightIndex = curTable.记录[curRound].findIndex(battle => battle.rightName === fixedPlayer);

    const prePoint = rate[0];
    const postPoint = rate[1] || 0;
    console.log(curTable.记录[curRound], fixedPlayer, leftIndex, rightIndex);
    if (leftIndex >= 0) {
      curTable.记录[curRound][leftIndex].leftPoint = prePoint;
      curTable.记录[curRound][leftIndex].rightPoint = postPoint;
    } else if (rightIndex >= 0) {
      curTable.记录[curRound][rightIndex].leftPoint = postPoint;
      curTable.记录[curRound][rightIndex].rightPoint = prePoint;
    } else {
      await e.reply(`未能在当前轮次找到玩家${fixedPlayer}`);
    }
    await redis.set('tabulate.table', JSON.stringify(curTable));

    return await new table().tabSee(e);
  }

  async nextTurn(e) {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);

    const newRound = curTable.记录.length;
    curTable.轮次 = newRound + 1;
    curTable.记录.push([]);
    await redis.set('tabulate.table', JSON.stringify(curTable));
    await redis.set('tabulate.round', newRound);

    return await new table().tabSee(e);
  }

  async selectTurn(e) {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);

    let toRound = e.msg
      .replace(/^#切换第/, '')
      .replace(/轮$/, '')
      .trim();
    if (isNaN(Number(toRound))) toRound = ch2Num(toRound);
    else toRound = Number(toRound);
    if (toRound <= 0 || curTable.记录.length < toRound) return await e.reply(`指定的轮次（${toRound}）不存在`);

    curTable.轮次 = toRound;
    await redis.set('tabulate.table', JSON.stringify(curTable));
    await redis.set('tabulate.round', toRound - 1);

    return await new table().tabSee(e);
  }
}
