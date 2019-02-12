/* eslint import/no-extraneous-dependencies: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint no-console: 0 */
/* INFO: https://github.com/zbycz/phraseapp-fetcher */

const fs = require('fs');
const fetch = require('isomorphic-unfetch');
const rimraf = require('rimraf');

const token = 'xxx'; // get from https://phraseapp.com/settings/oauth_access_tokens

async function fetchFromApi(uri) {
  const url = `https://api.phraseapp.com/api/v2${uri}`;
  const opts = { headers: { Authorization: `token ${token}` } };
  const res = await fetch(url, opts);
  const data = await res.json();
  if (res.status !== 200) {
    throw new Error(
      `Fetch: error ${res.status} Url: ${url} Data: ${JSON.stringify(data)}`,
    );
  }
  console.log(`Fetched ${url}`);
  return data;
}

async function getLocales(projectId) {
  const locales = await fetchFromApi(
    `/projects/${projectId}/locales?per_page=100`,
  );
  if (locales.length === 100) {
    throw new Error(
      'The /locales endpoint is paginated, but we have fetched only 1st page. Fixme!',
    );
  }
  return locales;
}

async function getTranslationFile(projectId, localeId) {
  return fetchFromApi(
    `/projects/${projectId}/locales/${localeId}/download?file_format=simple_json`,
  );
}

// for debuging: if (projectId === 'ad289fc2b22e8142790a88a3ba3041cc') return { 'en-GB': { nitro: 123 }, zha: { nitro: 'zha', 'holidays.accommodation.rooms': 'fsdfdfdfdzha' } };
async function getTranslations(projectId) {
  const locales = await getLocales(projectId);
  console.log(
    `Found ${
      locales.length
    } locales (languages). We will fetch all translation files now...`,
  );

  const translations = {};
  for (const locale of locales) {
    translations[locale.code] = await getTranslationFile(projectId, locale.id);
  }
  return translations;
}

function mergeTwoProjects(project1, project2) {
  const merged = {};
  // eslint-disable-next-line no-undef
  const uniqueLangs = new Set([
    ...Object.keys(project1),
    ...Object.keys(project2),
  ]);
  uniqueLangs.forEach(lang => {
    merged[lang] = { ...project1[lang], ...project2[lang] };
  });
  return merged;
}

function fallbackEmptyKeysToEnglish(translations) {
  const result = {};
  const fallback = translations['en-GB'];
  const langs = Object.keys(translations);
  langs.forEach(lang => {
    result[lang] = { ...fallback, ...translations[lang] };
  });
  return result;
}

function writeFiles(translations) {
  const folder = '.tmp-full-translation-files';
  rimraf.sync(folder);
  fs.mkdirSync(folder);

  const langs = Object.keys(translations);
  langs.forEach(lang => {
    fs.writeFileSync(
      `${folder}/${lang}.json`,
      JSON.stringify(translations[lang]),
      'utf8',
    );
  });

  console.log(`Wrote ${langs.length} files to "${folder}" folder. SUCCESS.`);
}

async function main() {
  const project1 = await getTranslations('<project1>');
  const project2 = await getTranslations('<project2>');
  const translations = mergeTwoProjects(project1, project2);
  const finalTranslations = fallbackEmptyKeysToEnglish(translations);
  writeFiles(finalTranslations);
}

main();
