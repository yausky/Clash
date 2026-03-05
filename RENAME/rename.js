/** /**Modified from https://raw.githubusercontent.com/Keywos/rule/main/rename.js
 * 目标：
 * - 模板化命名 tpl=
 * - 强力去重与规范化（默认开启）
 * - debug=on 输出调试尾巴（不含空格）
 * - only/skip/scope 黑白名单升级
 * - bucket 分桶重排序（region/tag/off）
 * - 最终输出：去除命名中所有空格（包括 flag 与地区之间）
 *
 * 兼容：保留你原有参数（in/out/nm/nx/blgd/bl/blnx/clear/blpx/one/flag/name/nf/blockquic/key/fgf/sn/blkey）
 *
 * 新增参数：
 * - tpl=   统一命名模板
 *   可用变量：
 *    {first}  nf=true 时放最前的机场前缀（FNAME）
 *    {flag}   国旗（flag=true 时才会有）
 *    {prefix} nf=false 时的机场前缀（FNAME）
 *    {region} 地区名（按 out= 输出类型）
 *    {retain} 关键词保留字段（blkey + blgd + bl 正则提取等）
 *    {rate}   倍率字段（bl/blgd等抽取）
 *    {raw}    原始节点名（清洗前）
 *    {clean}  清洗后的节点名（rurekey 后）
 *    {sn}     序号（jxh 后统一追加，这里通常不用）
 *
 *   默认 tpl：
 *    "{first}{flag}{prefix}{region}{retain}{rate}"
 *
 * - normalize=on/off  强力规范化开关（默认 on）
 * - only= / skip= / scope=
 *    支持：
 *      1) 关键词列表：only=iplc+NF+GPT
 *      2) 正则：only=/香港|日本/i
 *    逻辑：
 *      - scope 不命中：不改名（原样保留）
 *      - skip 命中：不改名（原样保留）
 *      - only 存在且不命中：不改名（原样保留）
 *
 * - bucket=region|tag|off  分桶重排序（默认 off）
 *    region：按地区在 REGIONS 里的顺序排序
 *    tag：按 blkey 命中的关键词顺序排序（先出现的关键词更靠前）
 *
 * - debug=on/off  调试尾巴（默认 off）
 */

const inArg = $arguments;

const nx = inArg.nx || false,
  bl = inArg.bl || false,
  nf = inArg.nf || false,
  key = inArg.key || false,
  blgd = inArg.blgd || false,
  blpx = inArg.blpx || false,
  blnx = inArg.blnx || false,
  numone = inArg.one ?? true,
  debug = inArg.debug || false,
  clear = inArg.clear || false,
  addflag = inArg.flag || false,
  nm = inArg.nm || false;

const normalizeOn = inArg.normalize === "off" ? false : true;

// ⚠️ 默认无分隔符（避免任何空格）
const FGF = inArg.fgf == undefined ? "" : decodeURI(inArg.fgf);
const XHFGF = inArg.sn == undefined ? "" : decodeURI(inArg.sn);
const FNAME = inArg.name == undefined ? "" : decodeURI(inArg.name);
const BLKEY = inArg.blkey == undefined ? "" : decodeURI(inArg.blkey);
const blockquic = inArg.blockquic == undefined ? "" : decodeURI(inArg.blockquic);

const tpl = inArg.tpl ? decodeURI(inArg.tpl) : "{first}{flag}{prefix}{region}{retain}{rate}";
const bucket = inArg.bucket ? decodeURI(inArg.bucket) : "region"; // region|tag|off

const onlyRule = inArg.only ? decodeURI(inArg.only) : "";
const skipRule = inArg.skip ? decodeURI(inArg.skip) : "";
const scopeRule = inArg.scope ? decodeURI(inArg.scope) : "";

const nameMap = {
  cn: "cn", zh: "cn",
  us: "us", en: "us",
  quan: "quan",
  gq: "gq", flag: "gq",
};
const inname = nameMap[inArg.in] || "";
const outputName = nameMap[inArg.out] || "";

// ===== REGIONS（保留你 upgrade.js 的结构即可；这里示例只列头部，实际请保留你全量 REGIONS） =====
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

// 为兼容旧变量写法（如果你后面还沿用 ZH/FG/QC/EN）
const ZH = REGIONS.map((r) => r.zh);
const FG = REGIONS.map((r) => r.flag);
const QC = REGIONS.map((r) => r.quan);
const EN = REGIONS.map((r) => r.en);

// ===== 你的 rurekey / 清理正则（建议直接沿用 upgrade.js 原样） =====
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

// ===== 原脚本里用到的过滤正则（建议你把 upgrade.js 原样搬过来）=====
const nameclear =
  /(套餐|到期|有效|剩余|版本|已用|过期|失联|测试|官方|网址|备用|群|TEST|客服|网站|获取|订阅|流量|机场|下次|官址|联系|邮箱|工单|学术|USE|USED|TOTAL|EXPIRE|EMAIL)/i;
// prettier-ignore
const regexArray=[/ˣ²/, /ˣ³/, /ˣ⁴/, /ˣ⁵/, /ˣ⁶/, /ˣ⁷/, /ˣ⁸/, /ˣ⁹/, /ˣ¹⁰/, /ˣ²⁰/, /ˣ³⁰/, /ˣ⁴⁰/, /ˣ⁵⁰/, /IPLC/i, /IEPL/i, /核心/, /边缘/, /高级/, /标准/, /实验/, /商宽/, /家宽/, /游戏|game/i, /购物/, /专线/, /LB/, /cloudflare/i, /\budp\b/i, /\bgpt\b/i,/udpn\b/];
// prettier-ignore
const valueArray= [ "2×","3×","4×","5×","6×","7×","8×","9×","10×","20×","30×","40×","50×","IPLC","IEPL","Kern","Edge","Pro","Std","Exp","Biz","Fam","Game","Buy","Zx","LB","CF","UDP","GPT","UDPN"];
const nameblnx = /(高倍|(?!1)2+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;
const namenx = /(高倍|(?!1)(0\.|\d)+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;

// key 过滤（沿用 upgrade.js 逻辑）
const keya =
  /港|Hong|HK|新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR|🇸🇬|🇭🇰|🇯🇵|🇺🇸|🇰🇷|🇹🇷/i;
const keyb =
  /(((1|2|3|4)\d)|(香港|Hong|HK) 0[5-9]|((新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR) 0[3-9]))/i;

// ===== 工具函数 =====
function getList(arg) {
  switch (arg) {
    case "us": return EN;
    case "gq": return FG;
    case "quan": return QC;
    default: return ZH;
  }
}

function parseMatcher(rule) {
  if (!rule) return null;
  // 正则写法：/xxx/i
  const m = rule.match(/^\/(.+)\/([gimsuy]*)$/);
  if (m) {
    try {
      return new RegExp(m[1], m[2]);
    } catch (e) {
      return null;
    }
  }
  // 关键词列表：a+b+c
  const parts = rule.split("+").filter(Boolean);
  if (!parts.length) return null;
  return parts;
}

function matchRule(ruleObj, text) {
  if (!ruleObj) return false;
  if (ruleObj instanceof RegExp) return ruleObj.test(text);
  // keyword list
  return ruleObj.some((k) => text.includes(k));
}

function stripAllSpaces(s) {
  // 移除所有空白（空格、制表、换行、全角空格等）
  return (s || "").replace(/\s+/g, "").replace(/\u3000/g, "");
}

function normalizeName(s) {
  if (!s) return s;
  let x = s;

  // 1) 全角/半角常见符号统一
  x = x.replace(/｜/g, "|").replace(/－/g, "-").replace(/＿/g, "_");

  // 2) 移除所有空白
  x = stripAllSpaces(x);

  // 3) 压缩重复分隔符
  x = x.replace(/\|{2,}/g, "|");
  x = x.replace(/-{2,}/g, "-");
  x = x.replace(/_{2,}/g, "_");

  // 4) 修剪首尾分隔符（只针对 |）
  x = x.replace(/^\|+/, "|").replace(/\|+$/, "|");

  // 5) 去重标签：|A|B|A| -> |A|B|
  // 只处理形如 |xxx|yyy| 的 retain 区域
  if (x.includes("|")) {
    const pieces = x.split("|");
    // pieces: ["prefix", "A", "B", "A", "suffix..."] 但不确定结构
    // 简单策略：把中间所有 token 去重后再拼回去（保留顺序）
    const seen = new Set();
    const rebuilt = [];
    for (let i = 0; i < pieces.length; i++) {
      const token = pieces[i];
      if (!token) continue;
      if (!seen.has(token)) {
        seen.add(token);
        rebuilt.push(token);
      }
    }
    // 仅当原来确实像标签串时才回写
    if (rebuilt.length >= 2) {
      // 注意：不强行给整串加 |，只把标签串连起来
      // 这里选择“只在检测到原串以 | 开头或包含多段 | 时”再加边界
      x = (s.startsWith("|") ? "|" : "") + rebuilt.join("|") + (s.endsWith("|") ? "|" : "");
      x = stripAllSpaces(x);
      x = x.replace(/\|{2,}/g, "|");
    }
  }

  return x;
}

function renderTemplate(tplStr, vars) {
  return tplStr.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}

// ===== 编号（jxh）=====
function jxh(nodes) {
  if (!nodes || nodes.length === 0) return [];
  const countMap = new Map();
  for (const node of nodes) {
    const name = node.name;
    const count = (countMap.get(name) || 0) + 1;
    countMap.set(name, count);
    node.name = `${name}${XHFGF}${String(count).padStart(2, "0")}`;
  }
  return nodes;
}

// ===== one：如果同地区只有一个节点，则去掉末尾 01；如果有多个，则保留编号 =====
function oneP(e) {
  const t = e.reduce((acc, item) => {
    const name = item.name.trim();

    // 分组键：去掉末尾编号（如 香港01 -> 香港，墨西哥01 -> 墨西哥）
    // 支持：
    // 香港01 / 香港1
    // 香港-01 / 香港_01 / 香港 01
    const base = name.replace(/(?:[\s._-]*)0?\d+$/, "");

    if (!acc[base]) acc[base] = [];
    acc[base].push(item);
    return acc;
  }, {});

  for (const k in t) {
    // 只有一个节点时，才去掉末尾 01
    if (t[k].length === 1) {
      const name = t[k][0].name.trim();

      // 仅当末尾是 01 时才删除；02/03 不动
      t[k][0].name = name.replace(/(?:[\s._-]*)01$/, "");
    }
  }

  return e;
}

// ===== blpx：如果你用到原脚本的倍率优先排序，建议直接用你 upgrade.js 的 fampx + specialRegex =====
const specialRegex = [
  /10x/i, /9x/i, /8x/i, /7x/i, /6x/i, /5x/i, /4x/i, /3x/i, /2x/i,
];
function fampx(pro) {
  const wis = [];
  const wnout = [];
  for (const proxy of pro) {
    const fan = specialRegex.some((regex) => regex.test(proxy.name));
    if (fan) wis.push(proxy);
    else wnout.push(proxy);
  }
  const sps = wis.map((proxy) => specialRegex.findIndex((regex) => regex.test(proxy.name)));
  wis.sort((a, b) => sps[wis.indexOf(a)] - sps[wis.indexOf(b)] || a.name.localeCompare(b.name));
  return wnout.concat(wis);
}

// ===== bucket 排序 =====
function bucketSort(nodes, meta) {
  if (!nodes || nodes.length <= 1) return nodes;
  if (bucket === "off") return nodes;

  const stable = nodes.map((n, i) => ({ n, i }));

  if (bucket === "region") {
    stable.sort((a, b) => {
      const ia = meta.get(a.n)?.regionIndex ?? 9999;
      const ib = meta.get(b.n)?.regionIndex ?? 9999;
      if (ia !== ib) return ia - ib;
      // 同地区：按名字
      const na = a.n.name || "";
      const nb = b.n.name || "";
      if (na !== nb) return na.localeCompare(nb);
      return a.i - b.i;
    });
  } else if (bucket === "tag") {
    stable.sort((a, b) => {
      const ta = meta.get(a.n)?.tagRank ?? 9999;
      const tb = meta.get(b.n)?.tagRank ?? 9999;
      if (ta !== tb) return ta - tb;
      const na = a.n.name || "";
      const nb = b.n.name || "";
      if (na !== nb) return na.localeCompare(nb);
      return a.i - b.i;
    });
  }

  return stable.map((x) => x.n);
}

// ===== 主入口 =====
function operator(pro) {
  const outList = getList(outputName);

  // 构造输入映射表：输入名称 -> 输出名称（地区）
  const Allmap = {};
  let inputList;
  if (inname !== "") inputList = [getList(inname)];
  else inputList = [ZH, FG, QC, EN];

  inputList.forEach((arr) => {
    arr.forEach((value, idx) => {
      Allmap[value] = outList[idx];
    });
  });

  // 黑白名单 matcher
  const onlyM = parseMatcher(onlyRule);
  const skipM = parseMatcher(skipRule);
  const scopeM = parseMatcher(scopeRule);

  // BLKEYS：用于 tag bucket 排序（关键词命中越靠前，rank 越小）
  const BLKEYS = BLKEY ? BLKEY.split("+").filter(Boolean) : [];

  // 预过滤（clear/nx/blnx/key）
  if (clear || nx || blnx || key) {
    pro = pro.filter((res) => {
      const n = res.name || "";
      const keep =
        !(clear && nameclear.test(n)) &&
        !(nx && namenx.test(n)) &&
        !(blnx && !nameblnx.test(n)) &&
        !(key && !(keya.test(n) && /2|4|6|7/i.test(n)));
      return keep;
    });
  }

  // 节点元信息（用于 bucket 排序）
  const meta = new Map();

  pro.forEach((e) => {
    const rawName = e.name || "";
    let workName = rawName;

    // scope/skip/only 逻辑：不命中就不改名，原样保留
    if (scopeM && !matchRule(scopeM, rawName)) {
      // 不改名
      e.name = normalizeOn ? normalizeName(rawName) : stripAllSpaces(rawName);
      return;
    }
    if (skipM && matchRule(skipM, rawName)) {
      e.name = normalizeOn ? normalizeName(rawName) : stripAllSpaces(rawName);
      return;
    }
    if (onlyM && !matchRule(onlyM, rawName)) {
      e.name = normalizeOn ? normalizeName(rawName) : stripAllSpaces(rawName);
      return;
    }

    // 1) rurekey 归一化
    Object.keys(rurekey).forEach((k) => {
      if (rurekey[k].test(workName)) {
        workName = workName.replace(rurekey[k], k);
      }
    });

    // 2) BlockQuic（沿用你的逻辑：仅标记节点属性）
    if (blockquic === "on") e.udp = false;
    if (blockquic === "off") e.udp = true;

    // 3) 识别地区
    //    - 先把 workName 中可能出现的输入地区（中文/旗帜/全称/缩写）映射到 outList 中对应的输出地区
    let regionOut = "";
    let regionIndex = 9999;

    // 尝试匹配：输入数组中出现的 value
    // 这里用“包含”策略，保证兼容机场乱写
    for (const keyStr in Allmap) {
      if (!keyStr) continue;
      if (workName.includes(keyStr)) {
        regionOut = Allmap[keyStr];
        regionIndex = outList.indexOf(regionOut);
        break;
      }
    }

    // 4) 关键词保留（upgrade 逻辑：保留词列表 + 自动两端加 |）
    const retainKeyList = [];
    let tagRank = 9999;

    if (BLKEYS.length) {
      for (let i = 0; i < BLKEYS.length; i++) {
        const item = BLKEYS[i];
        if (!item) continue;

        if (item.includes(">")) {
          const [oldKey, newKey] = item.split(">");
          if (oldKey && rawName.includes(oldKey)) {
            retainKeyList.push(newKey || oldKey);
            tagRank = Math.min(tagRank, i);
          }
        } else {
          if (rawName.includes(item)) {
            retainKeyList.push(item);
            tagRank = Math.min(tagRank, i);
          }
        }
      }
    }

    // 自动用 | 包裹关键词列表（你要求无空格，这里也不产生空格）
    let retainKey = "";
    if (retainKeyList.length) {
      retainKey = "|" + retainKeyList.join("|") + "|";
    }

    // 5) blgd/bl 倍率/标识提取（这里给你保留接口：你可以把 upgrade.js 的更完整提取逻辑搬进来）
    // 简化策略：从原名里抓常见倍率标识（可按你原版扩展）
    let rate = "";
    if (blgd) {
      const m = rawName.match(/(IPLC|IEPL|专线|家宽|原生|解锁|NF|Netflix|GPT|AI|Game|游戏)/i);
      if (m) rate += m[0];
    }
    if (bl) {
      const m2 = rawName.match(/(\d+(\.\d+)?x|x\d+(\.\d+)?|\d+倍)/i);
      if (m2) rate += m2[0];
    }

    // 6) 前缀位置
    const first = nf ? FNAME : "";
    const prefix = nf ? "" : FNAME;

    // 7) 国旗
    let flagStr = "";
    if (addflag && regionOut) {
      const idx = outList.indexOf(regionOut);
      if (idx !== -1) {
        flagStr = FG[idx];
        // 你原版逻辑：TW 显示成 🇨🇳（保留）
        if (flagStr === "🇹🇼") flagStr = "🇨🇳";
      }
    }

    // 8) 模板渲染
    if (!regionOut) {
      // 找不到地区：nm=true 则保留（加前缀），否则删掉
      if (nm) {
        const keep = (FNAME ? FNAME : "") + rawName;
        e.name = normalizeOn ? normalizeName(keep) : stripAllSpaces(keep);
      } else {
        e.name = null;
      }
      return;
    }

    const vars = {
      first,
      flag: flagStr,
      prefix,
      region: regionOut,
      retain: retainKey,
      rate,
      raw: rawName,
      clean: workName,
      sn: "",
    };

    let newName = renderTemplate(tpl, vars);

    // 9) 最终：强制去除所有空格 + 规范化/去重
    newName = stripAllSpaces(newName);
    if (normalizeOn) newName = normalizeName(newName);

    // 10) debug 尾巴（无空格）
    if (debug) {
      // 尾巴也不含空格
      const dbg = `〔r:${regionOut}|t:${retainKeyList.join(",") || "-"}|rt:${rate || "-"}〕`;
      newName = stripAllSpaces(newName + dbg);
    }

    e.name = newName;

    // 写入 meta（用于 bucket）
    meta.set(e, { regionIndex, tagRank });
  });

  // 过滤掉 name=null 的节点
  pro = pro.filter((e) => e.name !== null);

  // 分桶排序（在编号前做更合理：先分桶，再编号）
  pro = bucketSort(pro, meta);

  // 编号 + one
  pro = jxh(pro);
  if (numone) oneP(pro);

  // blpx：倍率优先排序（如果你开了它）
  if (blpx) pro = fampx(pro);

  // key：最后过滤（沿用你原脚本习惯）
  if (key) pro = pro.filter((e) => !keyb.test(e.name));

  // 最终再强制清空空格（双保险）
  pro.forEach((e) => (e.name = stripAllSpaces(e.name)));

  return pro;
}
