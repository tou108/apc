/**
 * 頑シミュ MHXX - スキルシミュレータ エンジン
 * 全データはオリジナルCSVから読み込む
 */

'use strict';

const GanSimu = (() => {

    // ========================
    // データ保持
    // ========================
    let skills = [];          // {name, system, points, type}
    let skillMap = {};        // name -> skill
    let systemMap = {};       // system -> [{name, points}] ソート済み

    let armors = {
        head: [], body: [], arm: [], wst: [], leg: []
    };
    let decos = [];           // {name, rarity, slots, skills:[{system,pts}]}
    let charms = [];          // preset charms (MHXX_CHARM.csv は基本情報のみ)

    let categories = {};      // カテゴリ名 -> [スキル名]
    let fukugo = {};          // 複合スキル name -> [発動スキル名]

    let initialized = false;
    let loadError = null;

    // ========================
    // CSV パーサ
    // ========================
    function parseCSV(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const result = [];
        for (const line of lines) {
            if (!line.trim() || line.startsWith('#')) continue;
            result.push(parseCSVLine(line));
        }
        return result;
    }

    function parseCSVLine(line) {
        const cols = [];
        let inQuote = false;
        let cur = '';
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                inQuote = !inQuote;
            } else if (c === ',' && !inQuote) {
                cols.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        cols.push(cur.trim());
        return cols;
    }

    // ========================
    // データ読み込み
    // ========================
    function readAsset(path) {
        if (typeof Android !== 'undefined') {
            return Android.readAsset(path);
        }
        return '';
    }

    function loadSkills() {
        const text = readAsset('data/MHXX_SKILL.csv');
        const rows = parseCSV(text);
        skills = [];
        skillMap = {};
        systemMap = {};

        for (const row of rows) {
            if (row.length < 3) continue;
            const name = row[0];
            const system = row[1];
            const points = parseInt(row[2]) || 0;
            const type = parseInt(row[3]) || 0;
            const skill = { name, system, points, type };
            skills.push(skill);
            skillMap[name] = skill;
            if (!systemMap[system]) systemMap[system] = [];
            systemMap[system].push(skill);
        }

        // 各系統内でポイント降順ソート（発動に必要なポイント順）
        for (const sys in systemMap) {
            systemMap[sys].sort((a, b) => b.points - a.points);
        }
    }

    function parseArmorCSV(text) {
        const rows = parseCSV(text);
        const result = [];
        for (const row of rows) {
            if (row.length < 16) continue;
            const name = row[0];
            if (!name) continue;
            const gender = parseInt(row[1]) || 0;
            const type = parseInt(row[2]) || 0;
            const rarity = parseInt(row[3]) || 0;
            const slots = parseInt(row[4]) || 0;
            const hrReq = parseInt(row[5]) || 0;
            const villageReq = parseInt(row[6]) || 0;
            const defBase = parseInt(row[8]) || 0;
            const defMax = parseInt(row[9]) || 0;
            const fireRes = parseInt(row[10]) || 0;
            const waterRes = parseInt(row[11]) || 0;
            const thunderRes = parseInt(row[12]) || 0;
            const iceRes = parseInt(row[13]) || 0;
            const dragonRes = parseInt(row[14]) || 0;

            const armorSkills = [];
            for (let i = 0; i < 5; i++) {
                const sys = row[15 + i * 2];
                const pts = parseInt(row[16 + i * 2]) || 0;
                if (sys && pts !== 0) {
                    armorSkills.push({ system: sys, pts });
                }
            }

            result.push({
                name, gender, type, rarity, slots,
                hrReq, villageReq, defBase, defMax,
                fireRes, waterRes, thunderRes, iceRes, dragonRes,
                skills: armorSkills
            });
        }
        return result;
    }

    function loadArmors() {
        armors.head = parseArmorCSV(readAsset('data/MHXX_EQUIP_HEAD.csv'));
        armors.body = parseArmorCSV(readAsset('data/MHXX_EQUIP_BODY.csv'));
        armors.arm  = parseArmorCSV(readAsset('data/MHXX_EQUIP_ARM.csv'));
        armors.wst  = parseArmorCSV(readAsset('data/MHXX_EQUIP_WST.csv'));
        armors.leg  = parseArmorCSV(readAsset('data/MHXX_EQUIP_LEG.csv'));
    }

    function loadDecos() {
        const text = readAsset('data/MHXX_DECO.csv');
        const rows = parseCSV(text);
        decos = [];
        for (const row of rows) {
            if (row.length < 7) continue;
            const name = row[0];
            if (!name) continue;
            const rarity = parseInt(row[1]) || 0;
            const slots = parseInt(row[2]) || 0;
            const hrReq = parseInt(row[3]) || 0;
            const decoSkills = [];
            for (let i = 0; i < 2; i++) {
                const sys = row[6 + i * 2];
                const pts = parseInt(row[7 + i * 2]) || 0;
                if (sys && pts !== 0) {
                    decoSkills.push({ system: sys, pts });
                }
            }
            decos.push({ name, rarity, slots, hrReq, skills: decoSkills });
        }
    }

    function loadCharms() {
        const text = readAsset('data/MHXX_CHARM.csv');
        const rows = parseCSV(text);
        charms = rows.filter(r => r.length >= 2 && r[0]).map(r => ({
            name: r[0], rarity: parseInt(r[1]) || 0
        }));
    }

    function loadCategories() {
        const text = readAsset('data/conf/CATEGORY.txt');
        categories = {};
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(',');
            if (parts.length < 2) continue;
            const catName = parts[0].trim();
            const skillNames = parts.slice(1).map(s => s.trim()).filter(s => s);
            categories[catName] = skillNames;
        }
    }

    function loadFukugo() {
        const text = readAsset('data/conf/FUKUGO.txt');
        fukugo = {};
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(',');
            if (parts.length < 2) continue;
            const name = parts[0].trim();
            const activations = parts.slice(1).map(s => s.trim()).filter(s => s);
            fukugo[name] = activations;
        }
    }

    function initialize() {
        if (initialized) return true;
        try {
            loadSkills();
            loadArmors();
            loadDecos();
            loadCharms();
            loadCategories();
            loadFukugo();
            initialized = true;
            return true;
        } catch (e) {
            loadError = e.message || String(e);
            console.error('初期化エラー:', e);
            return false;
        }
    }

    // ========================
    // スキル検索エンジン
    // ========================

    /**
     * 目標スキルからスキル系統とポイントのマップを作る
     * targetSkills: [{skillName: '攻撃力UP【大】'}]
     * returns: {system: {required: 20, skillName: '...'}, ...}
     */
    function buildTargetSystems(targetSkills) {
        const targets = {};
        for (const t of targetSkills) {
            const skill = skillMap[t.skillName];
            if (!skill) continue;
            const req = skill.points;
            if (!targets[skill.system] || Math.abs(req) > Math.abs(targets[skill.system].required)) {
                targets[skill.system] = {
                    required: req,
                    skillName: t.skillName,
                    type: skill.type
                };
            }
        }
        return targets;
    }

    /**
     * アーマーの系統ポイントの合計を計算
     */
    function calcSystemPoints(pieces, userCharm) {
        const pts = {};
        for (const piece of pieces) {
            if (!piece) continue;
            for (const sk of piece.skills) {
                pts[sk.system] = (pts[sk.system] || 0) + sk.pts;
            }
        }
        if (userCharm) {
            for (const sk of userCharm.skills) {
                pts[sk.system] = (pts[sk.system] || 0) + sk.pts;
            }
        }
        return pts;
    }

    /**
     * スロット数合計
     */
    function totalSlots(pieces, userCharm) {
        let s = 0;
        for (const p of pieces) if (p) s += (p.slots || 0);
        if (userCharm) s += (userCharm.slots || 0);
        return s;
    }

    /**
     * 装飾品をグリーディに詰めて系統ポイントを更新
     * targets: {system -> {required, ...}}
     * sysPoints: 現在のポイントマップ（上書きされる）
     * freeSlots: 空きスロット数
     * decoType: 0=両方, 1=剣士, 2=ガンナー
     */
    function greedyFillDecos(targets, sysPoints, freeSlots, decoType) {
        if (freeSlots <= 0) return;

        // ターゲット系統で不足しているものを探す
        const needed = {};
        for (const sys in targets) {
            const req = targets[sys].required;
            const cur = sysPoints[sys] || 0;
            if (req > 0 && cur < req) {
                needed[sys] = req - cur;
            } else if (req < 0 && cur > req) {
                needed[sys] = req - cur; // negative
            }
        }

        if (Object.keys(needed).length === 0) return;

        // スロットサイズ1→2→3の順で使う（小さいスロットから）
        const usedDecos = new Map();
        let slots = freeSlots;

        // ターゲット系統に有効な装飾品を優先度付きで並べる
        const candidates = decos.filter(d => {
            if (d.slots > slots) return false;
            if (decoType !== 0 && d.type && d.type !== 0 && d.type !== decoType) return false;
            // この装飾品がターゲット系統にプラスか確認
            return d.skills.some(sk => sk.pts > 0 && needed[sk.system] > 0);
        });

        // スロットコストが小さく効果が高い順
        candidates.sort((a, b) => {
            const scoreA = a.skills.reduce((acc, sk) => acc + (needed[sk.system] ? Math.abs(sk.pts) : 0), 0) / a.slots;
            const scoreB = b.skills.reduce((acc, sk) => acc + (needed[sk.system] ? Math.abs(sk.pts) : 0), 0) / b.slots;
            return scoreB - scoreA;
        });

        for (const deco of candidates) {
            if (slots < deco.slots) continue;
            // 何個使えるか（上限3個、かつ残スロット内）
            const maxCount = Math.min(3, Math.floor(slots / deco.slots));
            if (maxCount === 0) continue;

            // 実際に何個必要か計算
            let useCount = 0;
            for (const sk of deco.skills) {
                if (needed[sk.system] && sk.pts > 0) {
                    const need = needed[sk.system];
                    useCount = Math.max(useCount, Math.ceil(need / sk.pts));
                }
            }
            useCount = Math.min(useCount, maxCount);
            if (useCount <= 0) useCount = 1;

            for (let i = 0; i < useCount; i++) {
                if (slots < deco.slots) break;
                slots -= deco.slots;
                usedDecos.set(deco.name, (usedDecos.get(deco.name) || 0) + 1);
                for (const sk of deco.skills) {
                    sysPoints[sk.system] = (sysPoints[sk.system] || 0) + sk.pts;
                    if (needed[sk.system]) {
                        needed[sk.system] -= sk.pts;
                        if (needed[sk.system] <= 0) delete needed[sk.system];
                    }
                }
            }
            if (Object.keys(needed).length === 0) break;
        }

        return usedDecos;
    }

    /**
     * アーマーピースのターゲットに対するスコアを計算
     */
    function scorePiece(piece, targets) {
        let score = 0;
        for (const sk of piece.skills) {
            if (targets[sk.system]) {
                const req = targets[sk.system].required;
                if (req > 0 && sk.pts > 0) score += sk.pts * 3;
                else if (req < 0 && sk.pts < 0) score += Math.abs(sk.pts) * 3;
                else if (req > 0 && sk.pts < 0) score -= Math.abs(sk.pts) * 2;
            }
        }
        // スロット数もボーナス
        score += piece.slots * 0.5;
        return score;
    }

    /**
     * ターゲットを満たしているか確認
     */
    function checkTargets(sysPoints, targets) {
        for (const sys in targets) {
            const req = targets[sys].required;
            const cur = sysPoints[sys] || 0;
            if (req > 0 && cur < req) return false;
            if (req < 0 && cur > req) return false;
        }
        return true;
    }

    /**
     * スキル系統ポイントから発動スキル一覧を取得
     */
    function getActivatedSkills(sysPoints) {
        const activated = [];
        for (const sys in sysPoints) {
            const pts = sysPoints[sys];
            if (!systemMap[sys]) continue;
            // ポイントの大きい（発動に必要なポイントが大きい）順にチェック
            for (const skill of systemMap[sys]) {
                if (skill.points > 0 && pts >= skill.points) {
                    activated.push(skill.name);
                    break;
                } else if (skill.points < 0 && pts <= skill.points) {
                    activated.push(skill.name + '（マイナス）');
                    break;
                }
            }
        }
        return activated;
    }

    /**
     * メイン検索関数
     * @param {Array} targetSkillNames - 目標スキル名の配列
     * @param {Object} options - {hunterType: 0/1/2, userCharm: null|{skills,slots}}
     * @returns {Array} 結果配列
     */
    function search(targetSkillNames, options = {}) {
        if (!initialized) initialize();

        const hunterType = options.hunterType || 0;
        const userCharm = options.userCharm || null;
        const maxResults = options.maxResults || 30;
        const topK = options.topK || 12;

        if (targetSkillNames.length === 0) return [];

        const targets = buildTargetSystems(targetSkillNames.map(n => ({ skillName: n })));
        if (Object.keys(targets).length === 0) return [];

        // ハンタータイプでフィルタリング
        const filterByType = (pieces) => pieces.filter(p => {
            if (hunterType === 0) return true;
            return p.type === 0 || p.type === hunterType;
        });

        // 各スロットのアーマーをスコア順に並べてtopKだけ取る
        const topHead = filterByType(armors.head).sort((a, b) => scorePiece(b, targets) - scorePiece(a, targets)).slice(0, topK);
        const topBody = filterByType(armors.body).sort((a, b) => scorePiece(b, targets) - scorePiece(a, targets)).slice(0, topK);
        const topArm  = filterByType(armors.arm ).sort((a, b) => scorePiece(b, targets) - scorePiece(a, targets)).slice(0, topK);
        const topWst  = filterByType(armors.wst ).sort((a, b) => scorePiece(b, targets) - scorePiece(a, targets)).slice(0, topK);
        const topLeg  = filterByType(armors.leg ).sort((a, b) => scorePiece(b, targets) - scorePiece(a, targets)).slice(0, topK);

        const results = [];

        // 最大ポイント（残り部位で達成可能な上限）の事前計算
        const maxByPart = {};
        const parts = [topHead, topBody, topArm, topWst, topLeg];
        for (const sys in targets) {
            maxByPart[sys] = parts.map(arr =>
                Math.max(...arr.map(p => p.skills.find(s => s.system === sys)?.pts || 0))
            );
        }

        // 枝刈り付き深さ優先探索
        function dfs(depth, chosen, currentPts, currentSlots) {
            if (results.length >= maxResults) return;

            if (depth === 5) {
                // 装飾品で埋める
                const pts = Object.assign({}, currentPts);
                const usedDecos = greedyFillDecos(targets, pts, currentSlots, hunterType);

                if (checkTargets(pts, targets)) {
                    const activated = getActivatedSkills(pts);
                    results.push({
                        head: chosen[0],
                        body: chosen[1],
                        arm:  chosen[2],
                        wst:  chosen[3],
                        leg:  chosen[4],
                        charm: userCharm,
                        decos: usedDecos ? Object.fromEntries(usedDecos) : {},
                        sysPoints: pts,
                        activatedSkills: activated
                    });
                }
                return;
            }

            // 枝刈り: 残り部位すべて最大ポイントを足しても目標に届かないなら探索しない
            for (const piece of parts[depth]) {
                if (results.length >= maxResults) return;

                // 暫定ポイント = 現在 + このピースのポイント
                const newPts = Object.assign({}, currentPts);
                for (const sk of piece.skills) {
                    newPts[sk.system] = (newPts[sk.system] || 0) + sk.pts;
                }
                const newSlots = currentSlots + piece.slots;

                // 枝刈り: 残り部位の最大値を足しても届かない系統があれば skip
                let canPrune = false;
                if (depth < 4) {
                    for (const sys in targets) {
                        const req = targets[sys].required;
                        if (req <= 0) continue;
                        let maxReachable = newPts[sys] || 0;
                        for (let d = depth + 1; d < 5; d++) {
                            maxReachable += (maxByPart[sys][d] || 0);
                        }
                        // 装飾品で補える最大値も考慮（スロット × 最大装飾品効果）
                        maxReachable += (newSlots + (depth < 4 ? (4 - depth) * 3 : 0)) * 5;
                        if (maxReachable < req) { canPrune = true; break; }
                    }
                }
                if (canPrune) continue;

                chosen[depth] = piece;
                dfs(depth + 1, chosen, newPts, newSlots);
                chosen[depth] = null;
            }
        }

        // お守りのポイントを初期値に設定
        const initPts = {};
        const initSlots = userCharm ? userCharm.slots : 0;
        if (userCharm) {
            for (const sk of userCharm.skills) {
                initPts[sk.system] = (initPts[sk.system] || 0) + sk.pts;
            }
        }

        dfs(0, [null, null, null, null, null], initPts, initSlots);

        return results;
    }

    // ========================
    // 公開API
    // ========================
    return {
        initialize,
        getSkills: () => skills,
        getSkillMap: () => skillMap,
        getSystemMap: () => systemMap,
        getArmors: () => armors,
        getDecos: () => decos,
        getCharms: () => charms,
        getCategories: () => categories,
        getFukugo: () => fukugo,
        search,
        isInitialized: () => initialized,
        getError: () => loadError
    };
})();
