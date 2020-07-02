const fs = require('fs')
const path = require('path')
const pick = require('lodash/pick')

const { authSellerAndShop, authRole } = require('./_auth')
const { DSHOP_CACHE } = require('../utils/const')

module.exports = function (app) {
  app.put(
    '/collections',
    authSellerAndShop,
    authRole('admin'),
    async (req, res) => {
      const collections = req.body.collections

      try {
        const outDir = path.resolve(`${DSHOP_CACHE}/${req.shop.authToken}/data`)
        const collectionsPath = `${outDir}/collections.json`
        fs.writeFileSync(
          collectionsPath,
          JSON.stringify(collections, undefined, 2)
        )

        await req.shop.update({
          hasChanges: true
        })

        res.send({ success: true })
      } catch (e) {
        res.json({ success: false })
      }
    }
  )

  app.put(
    '/collections/:collectionId',
    authSellerAndShop,
    authRole('admin'),
    async (req, res) => {
      const { collectionId } = req.params

      try {
        const outDir = path.resolve(`${DSHOP_CACHE}/${req.shop.authToken}/data`)
        const collectionsPath = `${outDir}/collections.json`
        const collections = JSON.parse(fs.readFileSync(collectionsPath)).map(
          (collection) => {
            if (collection.id === collectionId) {
              return {
                ...pick(req.body, ['title', 'products']),
                id: collectionId
              }
            }

            return collection
          }
        )

        fs.writeFileSync(
          collectionsPath,
          JSON.stringify(collections, undefined, 2)
        )

        await req.shop.update({
          hasChanges: true
        })

        res.send({ success: true })
      } catch (e) {
        res.json({ success: false })
      }
    }
  )
}
