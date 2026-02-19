/**
 * 更新日期：2026-02-19 23:13:04
 * 用法：Sub-Store 脚本操作添加
 * rename.js 以下是此脚本支持的参数，必须以 # 为开头多个参数使用"&"连接，参考上述地址为例使用参数。 禁用缓存url#noCache
 * 新增：*港专线：避免被过滤
 *** 主要参数
 * [in=] 自动判断机场节点名类型 优先级 zh(中文) -> flag(国旗) -> quan(英文全称) -> en(英文简写)
 * 如果不准的情况, 可以加参数指定:
 *
 * [nm]    保留没有匹配到的节点
 * [in=zh] 或in=cn识别中文
 * [in=en] 或in=us 识别英文缩写
 * [in=flag] 或in=gq 识别国旗 如果加参数 in=flag 则识别国旗 脚本操作前面不要添加国旗操作 否则移除国旗后面脚本识别不到
 * [in=quan] 识别英文全称

 *
 * [out=]   输出节点名可选参数: (cn或zh ，us或en ，gq或flag ，quan) 对应：(中文，英文缩写 ，国旗 ，英文全称) 默认中文 例如 [out=en] 或 out=us 输出英文缩写
 *** 分隔符参数
 *
 * [fgf=]   节点名前缀或国旗分隔符，默认为空格；
 * [sn=]    设置国家与序号之间的分隔符，默认为空格；
 * 序号参数
 * [one]    清理只有一个节点的地区的01
 * [flag]   给节点前面加国旗
 *
 *** 前缀参数
 * [name=]  节点添加机场名称前缀；
 * [nf]     把 name= 的前缀值放在最前面
 *** 保留参数
 * [blkey=iplc+gpt+NF+IPLC] 用+号添加多个关键词 保留节点名的自定义字段 需要区分大小写!
 * 如果需要修改 保留的关键词 替换成别的 可以用 > 分割 例如 [#blkey=GPT>新名字+其他关键词] 这将把【GPT】替换成【新名字】
 * 例如      https://raw.githubusercontent.com/Keywos/rule/main/rename.js#flag&blkey=GPT>新名字+NF
 * [blgd]   保留: 家宽 IPLC ˣ² 等
 * [bl]     正则匹配保留 [0.1x, x0.2, 6x ,3倍]等标识
 * [nx]     保留1倍率与不显示倍率的
 * [blnx]   只保留高倍率
 * [clear]  清理乱名
 * [blpx]   如果用了上面的bl参数,对保留标识后的名称分组排序,如果没用上面的bl参数单独使用blpx则不起任何作用
 * [blockquic] blockquic=on 阻止; blockquic=off 不阻止
 * 去除文字间的空格
 */

// const inArg = {'blkey':'iplc+GPT>GPTnewName+NF+IPLC', 'flag':true };
const inArg = $arguments; // console.log(inArg)
const nx = inArg.nx || false,
  bl = inArg.bl || false,
  nf = inArg.nf || false,
  key = inArg.key || false,
  blgd = inArg.blgd || false,
  blpx = inArg.blpx || false,
  blnx = inArg.blnx || false,
  numone = inArg.one || false,
  debug = inArg.debug || false,
  clear = inArg.clear || false,
  addflag = inArg.flag || false,
  nm = inArg.nm || false;

const FGF = inArg.fgf == undefined ? "" : decodeURI(inArg.fgf),
  XHFGF = inArg.sn == undefined ? "" : decodeURI(inArg.sn),
  FNAME = inArg.name == undefined ? "" : decodeURI(inArg.name),
  BLKEY = inArg.blkey == undefined ? "" : decodeURI(inArg.blkey),
  blockquic = inArg.blockquic == undefined ? "" : decodeURI(inArg.blockquic),
  nameMap = {
    cn: "cn",
    zh: "cn",
    us: "us",
    en: "us",
    quan: "quan",
    gq: "gq",
    flag: "gq",
  },
  inname = nameMap[inArg.in] || "",
  outputName = nameMap[inArg.out] || "";

// prettier-ignore
const REGIONS = [
  { flag: '🇭🇰', en: 'HK', zh: '香港', quan: 'Hong Kong' },
  { flag: '🇲🇴', en: 'MO', zh: '澳门', quan: 'Macao' },
  { flag: '🇹🇼', en: 'TW', zh: '台湾', quan: 'Taiwan' },
  { flag: '🇯🇵', en: 'JP', zh: '日本', quan: 'Japan' },
  { flag: '🇰🇷', en: 'KR', zh: '韩国', quan: 'Korea' },
  { flag: '🇸🇬', en: 'SG', zh: '新加坡', quan: 'Singapore' },
  { flag: '🇺🇸', en: 'US', zh: '美国', quan: 'United States' },
  { flag: '🇬🇧', en: 'GB', zh: '英国', quan: 'United Kingdom' },
  { flag: '🇫🇷', en: 'FR', zh: '法国', quan: 'France' },
  { flag: '🇩🇪', en: 'DE', zh: '德国', quan: 'Germany' },
  { flag: '🇦🇺', en: 'AU', zh: '澳大利亚', quan: 'Australia' },
  { flag: '🇦🇪', en: 'AE', zh: '阿联酋', quan: 'Dubai' },
  { flag: '🇦🇫', en: 'AF', zh: '阿富汗', quan: 'Afghanistan' },
  { flag: '🇦🇱', en: 'AL', zh: '阿尔巴尼亚', quan: 'Albania' },
  { flag: '🇩🇿', en: 'DZ', zh: '阿尔及利亚', quan: 'Algeria' },
  { flag: '🇦🇴', en: 'AO', zh: '安哥拉', quan: 'Angola' },
  { flag: '🇦🇷', en: 'AR', zh: '阿根廷', quan: 'Argentina' },
  { flag: '🇦🇲', en: 'AM', zh: '亚美尼亚', quan: 'Armenia' },
  { flag: '🇦🇹', en: 'AT', zh: '奥地利', quan: 'Austria' },
  { flag: '🇦🇿', en: 'AZ', zh: '阿塞拜疆', quan: 'Azerbaijan' },
  { flag: '🇧🇭', en: 'BH', zh: '巴林', quan: 'Bahrain' },
  { flag: '🇧🇩', en: 'BD', zh: '孟加拉国', quan: 'Bangladesh' },
  { flag: '🇧🇾', en: 'BY', zh: '白俄罗斯', quan: 'Belarus' },
  { flag: '🇧🇪', en: 'BE', zh: '比利时', quan: 'Belgium' },
  { flag: '🇧🇿', en: 'BZ', zh: '伯利兹', quan: 'Belize' },
  { flag: '🇧🇯', en: 'BJ', zh: '贝宁', quan: 'Benin' },
  { flag: '🇧🇹', en: 'BT', zh: '不丹', quan: 'Bhutan' },
  { flag: '🇧🇴', en: 'BO', zh: '玻利维亚', quan: 'Bolivia' },
  { flag: '🇧🇦', en: 'BA', zh: '波斯尼亚和黑塞哥维那', quan: 'Bosnia and Herzegovina' },
  { flag: '🇧🇼', en: 'BW', zh: '博茨瓦纳', quan: 'Botswana' },
  { flag: '🇧🇷', en: 'BR', zh: '巴西', quan: 'Brazil' },
  { flag: '🇻🇬', en: 'VG', zh: '英属维京群岛', quan: 'British Virgin Islands' },
  { flag: '🇧🇳', en: 'BN', zh: '文莱', quan: 'Brunei' },
  { flag: '🇧🇬', en: 'BG', zh: '保加利亚', quan: 'Bulgaria' },
  { flag: '🇧🇫', en: 'BF', zh: '布基纳法索', quan: 'Burkina-faso' },
  { flag: '🇧🇮', en: 'BI', zh: '布隆迪', quan: 'Burundi' },
  { flag: '🇰🇭', en: 'KH', zh: '柬埔寨', quan: 'Cambodia' },
  { flag: '🇨🇲', en: 'CM', zh: '喀麦隆', quan: 'Cameroon' },
  { flag: '🇨🇦', en: 'CA', zh: '加拿大', quan: 'Canada' },
  { flag: '🇨🇻', en: 'CV', zh: '佛得角', quan: 'CapeVerde' },
  { flag: '🇰🇾', en: 'KY', zh: '开曼群岛', quan: 'CaymanIslands' },
  { flag: '🇨🇫', en: 'CF', zh: '中非共和国', quan: 'Central African Republic' },
  { flag: '🇹🇩', en: 'TD', zh: '乍得', quan: 'Chad' },
  { flag: '🇨🇱', en: 'CL', zh: '智利', quan: 'Chile' },
  { flag: '🇨🇴', en: 'CO', zh: '哥伦比亚', quan: 'Colombia' },
  { flag: '🇰🇲', en: 'KM', zh: '科摩罗', quan: 'Comoros' },
  { flag: '🇨🇬', en: 'CG', zh: '刚果(布)', quan: 'Congo-Brazzaville' },
  { flag: '🇨🇩', en: 'CD', zh: '刚果(金)', quan: 'Congo-Kinshasa' },
  { flag: '🇨🇷', en: 'CR', zh: '哥斯达黎加', quan: 'CostaRica' },
  { flag: '🇭🇷', en: 'HR', zh: '克罗地亚', quan: 'Croatia' },
  { flag: '🇨🇾', en: 'CY', zh: '塞浦路斯', quan: 'Cyprus' },
  { flag: '🇨🇿', en: 'CZ', zh: '捷克', quan: 'Czech Republic' },
  { flag: '🇩🇰', en: 'DK', zh: '丹麦', quan: 'Denmark' },
  { flag: '🇩🇯', en: 'DJ', zh: '吉布提', quan: 'Djibouti' },
  { flag: '🇩🇴', en: 'DO', zh: '多米尼加共和国', quan: 'Dominican Republic' },
  { flag: '🇪🇨', en: 'EC', zh: '厄瓜多尔', quan: 'Ecuador' },
  { flag: '🇪🇬', en: 'EG', zh: '埃及', quan: 'Egypt' },
  { flag: '🇸🇻', en: 'SV', zh: '萨尔瓦多', quan: 'EISalvador' },
  { flag: '🇬🇶', en: 'GQ', zh: '赤道几内亚', quan: 'Equatorial Guinea' },
  { flag: '🇪🇷', en: 'ER', zh: '厄立特里亚', quan: 'Eritrea' },
  { flag: '🇪🇪', en: 'EE', zh: '爱沙尼亚', quan: 'Estonia' },
  { flag: '🇪🇹', en: 'ET', zh: '埃塞俄比亚', quan: 'Ethiopia' },
  { flag: '🇫🇯', en: 'FJ', zh: '斐济', quan: 'Fiji' },
  { flag: '🇫🇮', en: 'FI', zh: '芬兰', quan: 'Finland' },
  { flag: '🇬🇦', en: 'GA', zh: '加蓬', quan: 'Gabon' },
  { flag: '🇬🇲', en: 'GM', zh: '冈比亚', quan: 'Gambia' },
  { flag: '🇬🇪', en: 'GE', zh: '格鲁吉亚', quan: 'Georgia' },
  { flag: '🇬🇭', en: 'GH', zh: '加纳', quan: 'Ghana' },
  { flag: '🇬🇷', en: 'GR', zh: '希腊', quan: 'Greece' },
  { flag: '🇬🇱', en: 'GL', zh: '格陵兰', quan: 'Greenland' },
  { flag: '🇬🇹', en: 'GT', zh: '危地马拉', quan: 'Guatemala' },
  { flag: '🇬🇳', en: 'GN', zh: '几内亚', quan: 'Guinea' },
  { flag: '🇬🇾', en: 'GY', zh: '圭亚那', quan: 'Guyana' },
  { flag: '🇭🇹', en: 'HT', zh: '海地', quan: 'Haiti' },
  { flag: '🇭🇳', en: 'HN', zh: '洪都拉斯', quan: 'Honduras' },
  { flag: '🇭🇺', en: 'HU', zh: '匈牙利', quan: 'Hungary' },
  { flag: '🇮🇸', en: 'IS', zh: '冰岛', quan: 'Iceland' },
  { flag: '🇮🇳', en: 'IN', zh: '印度', quan: 'India' },
  { flag: '🇮🇩', en: 'ID', zh: '印尼', quan: 'Indonesia' },
  { flag: '🇮🇷', en: 'IR', zh: '伊朗', quan: 'Iran' },
  { flag: '🇮🇶', en: 'IQ', zh: '伊拉克', quan: 'Iraq' },
  { flag: '🇮🇪', en: 'IE', zh: '爱尔兰', quan: 'Ireland' },
  { flag: '🇮🇲', en: 'IM', zh: '马恩岛', quan: 'Isle of Man' },
  { flag: '🇮🇱', en: 'IL', zh: '以色列', quan: 'Israel' },
  { flag: '🇮🇹', en: 'IT', zh: '意大利', quan: 'Italy' },
  { flag: '🇨🇮', en: 'CI', zh: '科特迪瓦', quan: 'Ivory Coast' },
  { flag: '🇯🇲', en: 'JM', zh: '牙买加', quan: 'Jamaica' },
  { flag: '🇯🇴', en: 'JO', zh: '约旦', quan: 'Jordan' },
  { flag: '🇰🇿', en: 'KZ', zh: '哈萨克斯坦', quan: 'Kazakstan' },
  { flag: '🇰🇪', en: 'KE', zh: '肯尼亚', quan: 'Kenya' },
  { flag: '🇰🇼', en: 'KW', zh: '科威特', quan: 'Kuwait' },
  { flag: '🇰🇬', en: 'KG', zh: '吉尔吉斯斯坦', quan: 'Kyrgyzstan' },
  { flag: '🇱🇦', en: 'LA', zh: '老挝', quan: 'Laos' },
  { flag: '🇱🇻', en: 'LV', zh: '拉脱维亚', quan: 'Latvia' },
  { flag: '🇱🇧', en: 'LB', zh: '黎巴嫩', quan: 'Lebanon' },
  { flag: '🇱🇸', en: 'LS', zh: '莱索托', quan: 'Lesotho' },
  { flag: '🇱🇷', en: 'LR', zh: '利比里亚', quan: 'Liberia' },
  { flag: '🇱🇾', en: 'LY', zh: '利比亚', quan: 'Libya' },
  { flag: '🇱🇹', en: 'LT', zh: '立陶宛', quan: 'Lithuania' },
  { flag: '🇱🇺', en: 'LU', zh: '卢森堡', quan: 'Luxembourg' },
  { flag: '🇲🇰', en: 'MK', zh: '马其顿', quan: 'Macedonia' },
  { flag: '🇲🇬', en: 'MG', zh: '马达加斯加', quan: 'Madagascar' },
  { flag: '🇲🇼', en: 'MW', zh: '马拉维', quan: 'Malawi' },
  { flag: '🇲🇾', en: 'MY', zh: '马来', quan: 'Malaysia' },
  { flag: '🇲🇻', en: 'MV', zh: '马尔代夫', quan: 'Maldives' },
  { flag: '🇲🇱', en: 'ML', zh: '马里', quan: 'Mali' },
  { flag: '🇲🇹', en: 'MT', zh: '马耳他', quan: 'Malta' },
  { flag: '🇲🇷', en: 'MR', zh: '毛利塔尼亚', quan: 'Mauritania' },
  { flag: '🇲🇺', en: 'MU', zh: '毛里求斯', quan: 'Mauritius' },
  { flag: '🇲🇽', en: 'MX', zh: '墨西哥', quan: 'Mexico' },
  { flag: '🇲🇩', en: 'MD', zh: '摩尔多瓦', quan: 'Moldova' },
  { flag: '🇲🇨', en: 'MC', zh: '摩纳哥', quan: 'Monaco' },
  { flag: '🇲🇳', en: 'MN', zh: '蒙古', quan: 'Mongolia' },
  { flag: '🇲🇪', en: 'ME', zh: '黑山共和国', quan: 'Montenegro' },
  { flag: '🇲🇦', en: 'MA', zh: '摩洛哥', quan: 'Morocco' },
  { flag: '🇲🇿', en: 'MZ', zh: '莫桑比克', quan: 'Mozambique' },
  { flag: '🇲🇲', en: 'MM', zh: '缅甸', quan: 'Myanmar(Burma)' },
  { flag: '🇳🇦', en: 'NA', zh: '纳米比亚', quan: 'Namibia' },
  { flag: '🇳🇵', en: 'NP', zh: '尼泊尔', quan: 'Nepal' },
  { flag: '🇳🇱', en: 'NL', zh: '荷兰', quan: 'Netherlands' },
  { flag: '🇳🇿', en: 'NZ', zh: '新西兰', quan: 'New Zealand' },
  { flag: '🇳🇮', en: 'NI', zh: '尼加拉瓜', quan: 'Nicaragua' },
  { flag: '🇳🇪', en: 'NE', zh: '尼日尔', quan: 'Niger' },
  { flag: '🇳🇬', en: 'NG', zh: '尼日利亚', quan: 'Nigeria' },
  { flag: '🇰🇵', en: 'KP', zh: '朝鲜', quan: 'NorthKorea' },
  { flag: '🇳🇴', en: 'NO', zh: '挪威', quan: 'Norway' },
  { flag: '🇴🇲', en: 'OM', zh: '阿曼', quan: 'Oman' },
  { flag: '🇵🇰', en: 'PK', zh: '巴基斯坦', quan: 'Pakistan' },
  { flag: '🇵🇦', en: 'PA', zh: '巴拿马', quan: 'Panama' },
  { flag: '🇵🇾', en: 'PY', zh: '巴拉圭', quan: 'Paraguay' },
  { flag: '🇵🇪', en: 'PE', zh: '秘鲁', quan: 'Peru' },
  { flag: '🇵🇭', en: 'PH', zh: '菲律宾', quan: 'Philippines' },
  { flag: '🇵🇹', en: 'PT', zh: '葡萄牙', quan: 'Portugal' },
  { flag: '🇵🇷', en: 'PR', zh: '波多黎各', quan: 'PuertoRico' },
  { flag: '🇶🇦', en: 'QA', zh: '卡塔尔', quan: 'Qatar' },
  { flag: '🇷🇴', en: 'RO', zh: '罗马尼亚', quan: 'Romania' },
  { flag: '🇷🇺', en: 'RU', zh: '俄罗斯', quan: 'Russia' },
  { flag: '🇷🇼', en: 'RW', zh: '卢旺达', quan: 'Rwanda' },
  { flag: '🇸🇲', en: 'SM', zh: '圣马力诺', quan: 'SanMarino' },
  { flag: '🇸🇦', en: 'SA', zh: '沙特阿拉伯', quan: 'SaudiArabia' },
  { flag: '🇸🇳', en: 'SN', zh: '塞内加尔', quan: 'Senegal' },
  { flag: '🇷🇸', en: 'RS', zh: '塞尔维亚', quan: 'Serbia' },
  { flag: '🇸🇱', en: 'SL', zh: '塞拉利昂', quan: 'SierraLeone' },
  { flag: '🇸🇰', en: 'SK', zh: '斯洛伐克', quan: 'Slovakia' },
  { flag: '🇸🇮', en: 'SI', zh: '斯洛文尼亚', quan: 'Slovenia' },
  { flag: '🇸🇴', en: 'SO', zh: '索马里', quan: 'Somalia' },
  { flag: '🇿🇦', en: 'ZA', zh: '南非', quan: 'SouthAfrica' },
  { flag: '🇪🇸', en: 'ES', zh: '西班牙', quan: 'Spain' },
  { flag: '🇱🇰', en: 'LK', zh: '斯里兰卡', quan: 'SriLanka' },
  { flag: '🇸🇩', en: 'SD', zh: '苏丹', quan: 'Sudan' },
  { flag: '🇸🇷', en: 'SR', zh: '苏里南', quan: 'Suriname' },
  { flag: '🇸🇿', en: 'SZ', zh: '斯威士兰', quan: 'Swaziland' },
  { flag: '🇸🇪', en: 'SE', zh: '瑞典', quan: 'Sweden' },
  { flag: '🇨🇭', en: 'CH', zh: '瑞士', quan: 'Switzerland' },
  { flag: '🇸🇾', en: 'SY', zh: '叙利亚', quan: 'Syria' },
  { flag: '🇹🇯', en: 'TJ', zh: '塔吉克斯坦', quan: 'Tajikstan' },
  { flag: '🇹🇿', en: 'TZ', zh: '坦桑尼亚', quan: 'Tanzania' },
  { flag: '🇹🇭', en: 'TH', zh: '泰国', quan: 'Thailand' },
  { flag: '🇹🇬', en: 'TG', zh: '多哥', quan: 'Togo' },
  { flag: '🇹🇴', en: 'TO', zh: '汤加', quan: 'Tonga' },
  { flag: '🇹🇹', en: 'TT', zh: '特立尼达和多巴哥', quan: 'TrinidadandTobago' },
  { flag: '🇹🇳', en: 'TN', zh: '突尼斯', quan: 'Tunisia' },
  { flag: '🇹🇷', en: 'TR', zh: '土耳其', quan: 'Turkey' },
  { flag: '🇹🇲', en: 'TM', zh: '土库曼斯坦', quan: 'Turkmenistan' },
  { flag: '🇻🇮', en: 'VI', zh: '美属维尔京群岛', quan: 'U.S.Virgin Islands' },
  { flag: '🇺🇬', en: 'UG', zh: '乌干达', quan: 'Uganda' },
  { flag: '🇺🇦', en: 'UA', zh: '乌克兰', quan: 'Ukraine' },
  { flag: '🇺🇾', en: 'UY', zh: '乌拉圭', quan: 'Uruguay' },
  { flag: '🇺🇿', en: 'UZ', zh: '乌兹别克斯坦', quan: 'Uzbekistan' },
  { flag: '🇻🇪', en: 'VE', zh: '委内瑞拉', quan: 'Venezuela' },
  { flag: '🇻🇳', en: 'VN', zh: '越南', quan: 'Vietnam' },
  { flag: '🇾🇪', en: 'YE', zh: '也门', quan: 'Yemen' },
  { flag: '🇿🇲', en: 'ZM', zh: '赞比亚', quan: 'Zambia' },
  { flag: '🇿🇼', en: 'ZW', zh: '津巴布韦', quan: 'Zimbabwe' },
  { flag: '🇦🇩', en: 'AD', zh: '安道尔', quan: 'Andorra' },
  { flag: '🇷🇪', en: 'RE', zh: '留尼汪', quan: 'Reunion' },
  { flag: '🇵🇱', en: 'PL', zh: '波兰', quan: 'Poland' },
  { flag: '🇬🇺', en: 'GU', zh: '关岛', quan: 'Guam' },
  { flag: '🇻🇦', en: 'VA', zh: '梵蒂冈', quan: 'Vatican' },
  { flag: '🇱🇮', en: 'LI', zh: '列支敦士登', quan: 'Liechtensteins' },
  { flag: '🇨🇼', en: 'CW', zh: '库拉索', quan: 'Curacao' },
  { flag: '🇸🇨', en: 'SC', zh: '塞舌尔', quan: 'Seychelles' },
  { flag: '🇦🇶', en: 'AQ', zh: '南极', quan: 'Antarctica' },
  { flag: '🇬🇮', en: 'GI', zh: '直布罗陀', quan: 'Gibraltar' },
  { flag: '🇨🇺', en: 'CU', zh: '古巴', quan: 'Cuba' },
  { flag: '🇫🇴', en: 'FO', zh: '法罗群岛', quan: 'Faroe Islands' },
  { flag: '🇦🇽', en: 'AX', zh: '奥兰群岛', quan: 'Ahvenanmaa' },
  { flag: '🇧🇲', en: 'BM', zh: '百慕达', quan: 'Bermuda' },
  { flag: '🇹🇱', en: 'TL', zh: '东帝汶', quan: 'Timor-Leste' },
  { flag: '🇦🇬', en: 'AG', zh: '安提瓜和巴布达', quan: 'Antigua and Barbuda' },
  { flag: '🇸🇧', en: 'SB', zh: '所罗门群岛', quan: 'Solomon Islands' },
  { flag: '🇯🇪', en: 'JE', zh: '泽西岛', quan: 'Jersey' },
  { flag: '🇧🇸', en: 'BS', zh: '巴哈马', quan: 'Bahamas' }
];

// 👇👇👇 关键修复：从 REGIONS 映射回旧变量，防止 operator 报错 👇👇👇
const EN = REGIONS.map(r => r.en);
const FG = REGIONS.map(r => r.flag);
const ZH = REGIONS.map(r => r.zh);
const QC = REGIONS.map(r => r.quan);

const specialRegex = [
  /(\d\.)?\d+×/,
  /IPLC|IEPL|Kern|Edge|Pro|Std|Exp|Biz|Fam|Game|Buy|Zx|LB|Game/,
];
const nameclear =
  /(套餐|到期|有效|剩余|版本|已用|过期|失联|测试|官方|网址|备用|群|TEST|客服|网站|获取|订阅|流量|机场|下次|官址|联系|邮箱|工单|学术|USE|USED|TOTAL|EXPIRE|EMAIL)/i;
// prettier-ignore
const regexArray=[/ˣ²/, /ˣ³/, /ˣ⁴/, /ˣ⁵/, /ˣ⁶/, /ˣ⁷/, /ˣ⁸/, /ˣ⁹/, /ˣ¹⁰/, /ˣ²⁰/, /ˣ³⁰/, /ˣ⁴⁰/, /ˣ⁵⁰/, /IPLC/i, /IEPL/i, /核心/, /边缘/, /高级/, /标准/, /实验/, /商宽/, /家宽/, /游戏|game/i, /购物/, /专线/, /LB/, /cloudflare/i, /\budp\b/i, /\bgpt\b/i,/udpn\b/];
// prettier-ignore
const valueArray= [ "2×","3×","4×","5×","6×","7×","8×","9×","10×","20×","30×","40×","50×","IPLC","IEPL","Kern","Edge","Pro","Std","Exp","Biz","Fam","Game","Buy","Zx","LB","CF","UDP","GPT","UDPN"];
const nameblnx = /(高倍|(?!1)2+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;
const namenx = /(高倍|(?!1)(0\.|\d)+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;
const keya =
  /港|Hong|HK|新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR|🇸🇬|🇭🇰|🇯🇵|🇺🇸|🇰🇷|🇹🇷/i;
const keyb =
  /(((1|2|3|4)\d)|(香港|Hong|HK) 0[5-9]|((新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR) 0[3-9]))/i;
const rurekey = {
  GB: /UK/g,
  "B-G-P": /BGP/g,
  "Russia Moscow": /Moscow/g,
  "Korea Chuncheon": /Chuncheon|Seoul/g,
  "Hong Kong": /Hongkong|HONG KONG/gi,
  "United Kingdom London": /London|Great Britain/g,
  "Dubai United Arab Emirates": /United Arab Emirates/g,
  "Taiwan TW 台湾 🇹🇼": /(台|Tai\s?wan|TW).*?🇨🇳|🇨🇳.*?(台|Tai\s?wan|TW)/g,
  "United States": /USA|Los Angeles|San Jose|Silicon Valley|Michigan/g,
  澳大利亚: /澳洲|墨尔本|悉尼|土澳|(深|沪|呼|京|广|杭)澳/g,
  德国: /(深|沪|呼|京|广|杭)德(?!.*(I|线))|法兰克福|滬德/g,
  香港: /((深|沪|呼|京|广|杭)\s?港(?!.*(I|线))|[\u4e00-\u9fa5]{1,2}港专线)/g,
  日本: /(深|沪|呼|京|广|杭|中|辽)日(?!.*(I|线))|东京|大坂/g,
  新加坡: /狮城|(深|沪|呼|京|广|杭)新/g,
  美国: /(深|沪|呼|京|广|杭)美|波特兰|芝加哥|哥伦布|纽约|硅谷|俄勒冈|西雅图|芝加哥/g,
  波斯尼亚和黑塞哥维那: /波黑共和国/g,
  印尼: /印度尼西亚|雅加达/g,
  印度: /孟买/g,
  阿联酋: /迪拜|阿拉伯联合酋长国/g,
  孟加拉国: /孟加拉/g,
  捷克: /捷克共和国/g,
  台湾: /新台|新北|台(?!.*线)/g,
  Taiwan: /Taipei/g,
  韩国: /春川|韩|首尔/g,
  Japan: /Tokyo|Osaka/g,
  英国: /伦敦/g,
  India: /Mumbai/g,
  Germany: /Frankfurt/g,
  Switzerland: /Zurich/g,
  俄罗斯: /莫斯科/g,
  土耳其: /伊斯坦布尔/g,
  泰国: /泰國|曼谷/g,
  法国: /巴黎/g,
  G: /\d\s?GB/gi,
  Esnc: /esnc/gi,
};

let GetK = false, AMK = []
function ObjKA(i) {
  GetK = true
  AMK = Object.entries(i)
}

function operator(pro) {
  const Allmap = {};
  const outList = getList(outputName);
  let inputList;

  if (inname !== "") {
    inputList = [getList(inname)];
  } else {
    inputList = [ZH, FG, QC, EN];
  }

  inputList.forEach((arr) => {
    arr.forEach((value, valueIndex) => {
      Allmap[value] = outList[valueIndex];
    });
  });

  // 1. 预先过滤节点 (Clear/Nx等)
  if (clear || nx || blnx || key) {
    pro = pro.filter((res) => {
      const resname = res.name;
      const shouldKeep =
        !(clear && nameclear.test(resname)) &&
        !(nx && namenx.test(resname)) &&
        !(blnx && !nameblnx.test(resname)) &&
        !(key && !(keya.test(resname) && /2|4|6|7/i.test(resname)));
      return shouldKeep;
    });
  }

  const BLKEYS = BLKEY ? BLKEY.split("+") : [];

  pro.forEach((e) => {
    // 2. 基础清洗 (rurekey)
    Object.keys(rurekey).forEach((ikey) => {
      if (rurekey[ikey].test(e.name)) {
        e.name = e.name.replace(rurekey[ikey], ikey);
      }
    });

    // BlockQuic 处理
    if (blockquic == "on") {
      e["block-quic"] = "on";
    } else if (blockquic == "off") {
      e["block-quic"] = "off";
    } else {
      delete e["block-quic"];
    }

    // 3. 关键修复：blkey 关键词提取 (支持重命名 + 多词保留)
    let retainKeyList = [];
    if (BLKEY) {
      BLKEYS.forEach((rule) => {
        if (rule.includes(">")) {
          // 模式：旧名>新名 (例如 ChatGpt>ChatGPT)
          const [target, replacement] = rule.split(">");
          // 只要原名里包含旧词，就把新词加入保留列表
          if (e.name.includes(target)) {
            retainKeyList.push(replacement);
          }
        } else {
          // 模式：直接保留 (例如 Netflix)
          if (e.name.includes(rule)) {
            retainKeyList.push(rule);
          }
        }
      });
    }
    // ⭐ 新增功能：如果有关键词，自动在最后加一个竖线分隔符
    if (retainKeyList.length > 0) {
      retainKeyList.unshift("|"); // 在最前面插一根
      retainKeyList.push("|");    // 在最后面插一根
    }
    // 将收集到的所有关键词(改名后的+未改名的)赋值给 retainKey
    let retainKey = retainKeyList;


    // 4. 倍率提取
    let ikey = "", ikeys = "";
    if (blgd) {
      regexArray.forEach((regex, index) => {
        if (regex.test(e.name)) {
          ikeys = valueArray[index];
        }
      });
    }
    if (bl) {
      const match = e.name.match(
        /((倍率|X|x|×)\D?((\d{1,3}\.)?\d+)\D?)|((\d{1,3}\.)?\d+)(倍|X|x|×)/
      );
      if (match) {
        const rev = match[0].match(/(\d[\d.]*)/)[0];
        if (rev !== "1") {
          ikey = rev + "×";
        }
      }
    }

    // 5. 地区匹配与最终命名拼接
    !GetK && ObjKA(Allmap)
    const findKey = AMK.find(([key]) => e.name.includes(key));
    
    let firstName = "", nNames = "";
    if (nf) {
      firstName = FNAME;
    } else {
      nNames = FNAME;
    }

    if (findKey?.[1]) {
      const findKeyValue = findKey[1];
      let usflag = "";
      if (addflag) {
        const index = outList.indexOf(findKeyValue);
        if (index !== -1) {
          usflag = FG[index];
          usflag = usflag === "🇹🇼" ? "🇨🇳" : usflag;
        }
      }
      
      // 拼接顺序：前缀 + 国旗 + 名字前缀 + 地区名 + 【关键词列表】 + 倍率
      let keyover = []
        .concat(firstName, usflag, nNames, findKeyValue, retainKey, ikey, ikeys)
        .filter((k) => k !== "");
      e.name = keyover.join(FGF);
    } else {
      if (nm) {
        e.name = FNAME + FGF + e.name;
      } else {
        e.name = null;
      }
    }
  });

  pro = pro.filter((e) => e.name !== null);
  pro = jxh(pro);
  numone && oneP(pro);
  blpx && (pro = fampx(pro));
  key && (pro = pro.filter((e) => !keyb.test(e.name)));
  return pro;
}

// prettier-ignore
function getList(arg) {
  switch (arg) {
    case 'us': // 返回英文缩写数组 (EN)
      return REGIONS.map(r => r.en);
    case 'gq': // 返回国旗数组 (FG)
      return REGIONS.map(r => r.flag);
    case 'quan': // 返回英文全称数组 (QC)
      return REGIONS.map(r => r.quan);
    default: // 默认返回中文名称数组 (ZH)
      return REGIONS.map(r => r.zh);
  }
}
// prettier-ignore
// 优化后的 jxh 函数
function jxh(nodes) {
  if (!nodes || nodes.length === 0) return [];
  
  const countMap = new Map();
  const result = [];

  for (const node of nodes) {
    const name = node.name;
    if (!countMap.has(name)) {
      countMap.set(name, 0);
    }
    const count = countMap.get(name) + 1;
    countMap.set(name, count);

    node.name = `${name}${XHFGF}${count.toString().padStart(2, "0")}`;
    result.push(node);
  }

  return result;
}
// prettier-ignore
function oneP(e) { const t = e.reduce((e, t) => { const n = t.name.replace(/[^A-Za-z0-9\u00C0-\u017F\u4E00-\u9FFF]+\d+$/, ""); if (!e[n]) { e[n] = []; } e[n].push(t); return e; }, {}); for (const e in t) { if (t[e].length === 1 && t[e][0].name.endsWith("01")) {/* const n = t[e][0]; n.name = e;*/ t[e][0].name= t[e][0].name.replace(/[^.]01/, "") } } return e; }
// prettier-ignore
function fampx(pro) { const wis = []; const wnout = []; for (const proxy of pro) { const fan = specialRegex.some((regex) => regex.test(proxy.name)); if (fan) { wis.push(proxy); } else { wnout.push(proxy); } } const sps = wis.map((proxy) => specialRegex.findIndex((regex) => regex.test(proxy.name)) ); wis.sort( (a, b) => sps[wis.indexOf(a)] - sps[wis.indexOf(b)] || a.name.localeCompare(b.name) ); wnout.sort((a, b) => pro.indexOf(a) - pro.indexOf(b)); return wnout.concat(wis);}
