'use strict';

const { format } = require('date-fns');

const bestof = {
  command: '!bestof',
  args: [{ name: 'whom', required: false }],
  help: 'Display a random featured message, or the list if passed `all`. Use the :tm: emoji to add messages.',
  async run([whom], { db, rtm, channel }) {
    const getQuotes = whom === 'all' ? getAllQuotes : getOneQuote(whom);

    try {
      const quotes = await getQuotes(db);
      await rtm.sendMessage(formatQuotes(quotes), channel);
    } catch (exception) {
      await rtm.sendMessage('_Unable to fetch the quotes…_', channel);
    }
  },
};

const getAllQuotes = db => {
  return new Promise((resolve, reject) => {
    db.all(`
      select
        ts,
        added_by as addedBy,
        author,
        message
      from
        bestof
      order by
        ts desc
    `, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    })
  });
};

const getOneQuote = (whom) => db => {
  const author = /^<@(U[^>]+)>$/.test(whom) ? whom.slice(2, -1) : null;

  // LOL THIS IS SO UGLY
  const query = author === null ? `
    select
      ts,
      added_by as addedBy,
      author,
      message
    from
      bestof
    order by
      random()
    limit 1
  ` : `
    select
      ts,
      added_by as addedBy,
      author,
      message
    from
      bestof
    where
      author = $author
    order by
      random()
    limit 1
  `;

  const placeholders = author ? { $author: author } : {};

  return new Promise((resolve, reject) => {
    db.all(query, placeholders, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    })
  });
};

const formatQuotes = (quotes) => {
  if (quotes.length === 0) {
    return '_I’ve got NOTHING on them. NOTHING!_';
  }

  return quotes.map(quote => {
    const date = format(new Date(quote.ts * 1000), 'PPP');

    return [
      `> ${quote.message}`,
      `> _– <@${quote.author}>, ${date} (added by <@${quote.addedBy}>)_`
    ].join('\n');
  }).join('\n\n');
};

module.exports = bestof;
