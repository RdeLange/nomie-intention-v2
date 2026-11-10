<script lang="ts">
  import { onMount } from 'svelte';
  import { dayKey, intentionNote, keptNote, prune, suggestionsForDay, weekSummary, type IntentionsByDay } from './logic';
  import { t, setLanguage, currentLanguage } from './i18n/index.svelte';
  import { paletteFrom, glassFrom, tintTextFrom, type Palette, type Glass } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';

  // Nomie passes the colours and text size of the app. The defaults only show when the plugin is opened outside Nomie.
  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let tintText = $state(tintTextFrom(undefined));
  let scale = $state(1);
  let byDay = $state<IntentionsByDay>({});
  let draft = $state('');
  let ready = $state(false);
  let today = $state(new Date());

  const key = $derived(dayKey(today));
  const intention = $derived(byDay[key]);
  const suggestions = $derived(suggestionsForDay(today));
  const week = $derived(weekSummary(byDay, today));

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    tintText = tintTextFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const save = () => plugin?.storage.setItem('intentions', byDay);

  // Setting the intention also writes it into the timeline, so it shows with the rest of the day
  const setIntention = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    byDay = prune({ ...byDay, [key]: { text: clean, kept: false } }, today);
    save();
    draft = '';
    plugin.createNote(intentionNote(clean));
  };

  const markKept = () => {
    if (!intention || intention.kept) return;
    byDay = { ...byDay, [key]: { ...intention, kept: true } };
    save();
    plugin.createNote(keptNote(intention.text));
  };

  // Lets the user pick another intention today. The note already in the timeline stays, as it is a record.
  const change = () => {
    draft = intention?.text || '';
    const { [key]: _, ...rest } = byDay;
    byDay = rest;
    save();
  };

  const load = async () => {
    await plugin.storage.init();
    byDay = plugin.storage.getItem('intentions') || {};
    today = new Date();
    ready = true;
  };

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie Intention',
      emoji: '🎯',
      description: 'Set one intention for the day, see it on the dashboard, and mark it as kept in the evening.',
      uses: ['createNote', 'getStorageItem', 'setStorageItem', 'getTrackable', 'openTrackableEditor', 'confirm'],
      version: '2.0',
      addToCaptureMenu: false,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues());
    plugin.onRegistered(async () => {
      applyNomieValues();
      await load();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      today = new Date();
      if (!ready) await load();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      today = new Date();
      offerTracker(plugin, { tag: 'intention', label: t('trackerLabel'), emoji: '🎯', color: '#FF9F0A' });
      if (!ready) await load();
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --good: {palette.good}; --good-soft: {palette.goodSoft}; --tint-text: {tintText}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="widget-row">
      <span class="emoji" aria-hidden="true">🎯</span>
      {#if intention}
        <span class="grow">{intention.text}</span>
        {#if intention.kept}
          <span class="badge">{t('keptBadge')}</span>
        {:else}
          <button class="small" onclick={markKept}>{t('keptIt')}</button>
        {/if}
      {:else}
        <span class="grow muted">{t('widgetNone')}</span>
      {/if}
    </div>
  {:else}
    <header class="top"><h1>{t('title')}</h1></header>
    <p class="muted">{today.toLocaleDateString(currentLanguage(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>

    {#if intention}
      <section class="panel">
        <p class="big">{intention.text}</p>
        {#if intention.kept}
          <p class="kept">{t('keptToday')}</p>
        {:else}
          <button class="primary" onclick={markKept}>{t('iKept')}</button>
        {/if}
        <button class="link" onclick={change}>{t('change')}</button>
      </section>
    {:else}
      <section class="panel">
        <form onsubmit={(e) => { e.preventDefault(); setIntention(draft); }}>
          <input bind:value={draft} placeholder={t('placeholder')} maxlength="120" />
          <button class="primary" type="submit" disabled={!draft.trim()}>{t('setIntention')}</button>
        </form>
      </section>

      <h2>{t('orPick')}</h2>
      <section class="panel list">
        {#each suggestions as suggestion (suggestion)}
          <button class="row" onclick={() => setIntention(suggestion)}>{suggestion}</button>
        {/each}
      </section>
    {/if}

    <h2>{t('lastSeven')}</h2>
    <section class="panel">
      <p class="stat">{t('statLine', { kept: week.kept, set: week.set, unit: week.set === 1 ? t('intentionOne') : t('intentionMany') })}</p>
    </section>
  {/if}
</div>

<style>
  /* the app's text: its iOS font stack, with the app's smoothing */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): it stays at the top and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(17px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(15px * var(--scale)); }
  h1 { margin: 0; font-size: calc(28px * var(--scale)); font-weight: 700; }
  h2 { margin: 24px 0 8px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 0; color: var(--muted); }
  .panel { margin-top: 16px; padding: 16px; border-radius: 16px; background: var(--card); }
  h2 + .panel { margin-top: 0; }
  .big { margin: 0 0 16px; font-size: calc(22px * var(--scale)); font-weight: 600; }
  .kept { margin: 0; padding: 12px; border-radius: 12px; background: var(--good-soft); color: var(--good); font-weight: 600; text-align: center; }
  .stat { margin: 0; }
  input { box-sizing: border-box; width: 100%; margin-bottom: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: transparent; color: inherit; font: inherit; }
  .primary { display: block; width: 100%; padding: 12px; border: 0; border-radius: 12px; background: var(--tint); color: var(--on-tint); font: inherit; font-weight: 600; cursor: pointer; }
  .primary:disabled { opacity: 0.5; cursor: default; }
  .link { display: block; margin: 12px auto 0; padding: 4px; border: 0; background: transparent; color: var(--tint-text); font: inherit; font-size: calc(15px * var(--scale)); cursor: pointer; }
  .list { padding: 4px 16px; }
  .row { display: block; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid var(--line); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .row:first-child { border-top: 0; }
  .widget-row { display: flex; align-items: center; gap: 12px; }
  .grow { flex: 1; }
  .emoji { font-size: calc(26px * var(--scale)); }
  .small { padding: 6px 12px; border: 0; border-radius: 999px; background: var(--tint); color: var(--on-tint); font: inherit; font-weight: 600; cursor: pointer; }
  .badge { padding: 6px 12px; border-radius: 999px; background: var(--good-soft); color: var(--good); font-weight: 600; }
</style>
