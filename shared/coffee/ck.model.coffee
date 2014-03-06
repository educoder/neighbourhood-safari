if typeof exports isnt "undefined" and exports isnt null
  # we're in node
  jQuery = require("jquery")
  _ = require("underscore")
  Backbone = require("backbone")
  Backbone.$ = jQuery
  Drowsy = require("backbone.drowsy").Drowsy
  
  #var Wakeful = require('Backbone.Drowsy/wakeful').Wakeful;
  CK = {}
  exports.CK = CK
else
  window.CK = window.CK or {}
  CK = window.CK
  jQuery = window.$
  _ = window._
  Drowsy = window.Drowsy

class CK.Model
    @requiredCollections = [
        'contributions',
        'tags',
        'states',
        'proposals',
        'investigations'
    ]

    @init: (url, db) ->
        deferredConfigure = jQuery.Deferred()

        unless url?
            throw new Error "Cannot configure model because no DrowsyDromedary URL was given!"
        unless db?
            throw new Error "Cannot configure model because no database name was given!"

        @baseURL = url
        @dbURL= "#{url}/#{db}"

        @server = new Drowsy.Server(url)
        @db = @server.database(db)

        @createNecessaryCollections(@requiredCollections).then =>
            @defineModelClasses()
            deferredConfigure.resolve()

        return deferredConfigure
                    

    @createNecessaryCollections: (requiredCollections) ->
        dfs = []
        df = jQuery.Deferred()

        @db.collections (colls) =>
            existingCollections = _.pluck(colls, 'name')
        
            for col in requiredCollections
                unless col in existingCollections
                    console.log "Creating collection '#{col}' under #{CK.Model.dbURL}"
                    dfs.push(@db.createCollection col)

        jQuery.when.apply(jQuery, dfs).done -> df.resolve()
        return df


    @defineModelClasses: ->

        class VotableMixin
            addVote: (username) ->
                votes = _.clone @get('votes')
                votes ?= []
                votes.push(username)
                @set 'votes', votes

            removeVote: (username) ->
                votes = _.without @get('votes'), username
                @set 'votes', votes

        class BuildOnableMixin
            addBuildOn: (author, content) ->
                build_ons = _.clone @get('build_ons')
                build_ons ?= []
                bo =
                    content: content
                    author: author
                    created_at: new Date()

                build_ons.push(bo)
                @set 'build_ons', build_ons

        class TaggableMixin
            addTag: (tag, tagger) =>
                unless tag instanceof CK.Model.Tag
                    console.error("Cannot addTag ", tag ," because it is not a CK.Model.Tag instance!")
                    throw "Invalid tag (doesn't exist)"

                unless tag.id
                    console.error("Cannot addTag ", tag ," to contribution ", @ ," because it doesn't have an id!")
                    throw "Invalid tag (no id)"

                existingTagRelationships = @get('tags') || []

                if _.any(existingTagRelationships, (tr) => tr.id is tag.id)
                    console.warn("Cannot addTag ", tag ," to contribution ", @ , " because it already has this tag.")
                    return this

                tagRel = @tagRel tag, tagger


                existingTagRelationships.push(tagRel)

                @set 'tags', existingTagRelationships

                return this

            removeTag: (tag, tagger) =>
                reducedTags = _.reject @get('tags'), (t) =>
                    (t.id is tag.id || t.name is tag.get('name')) and
                        (not tagger? || t.tagger is tagger)

                @set('tags', reducedTags)

                return this

            hasTag: (tag, tagger) =>
                _.any @get('tags'), (t) =>
                    t.id.toLowerCase() is tag.id and
                        (not tagger? || t.tagger is tagger)

        class @Contribution extends @db.Document('contributions')
            _.extend(@prototype, TaggableMixin.prototype)

            tagRel: (tag, tagger) ->
                return {
                    id: tag.id.toLowerCase()
                    name: tag.get('name')
                    tagger: tagger
                    tagged_at: new Date()
                }

        class @Proposal extends @db.Document('proposals')
            _.extend(@prototype, VotableMixin.prototype)

            validate: (attrs) ->
                unless _.all(attrs.votes, (a) -> typeof a is 'string')
                    return "'votes' must be an array of strings but is #{JSON.stringify(attrs.votes)}"

            setTag: (tag) ->
                @_tag = null
                @set 'tag',
                    id: tag.id.toLowerCase()
                    name: tag.get('name')
                    colorClass: tag.get('colorClass')

            getColorClass: ->
                if @has 'tag'
                    @get('tag').colorClass
                else
                    null

            getTag: ->
                return null unless @has('tag')
                # memoize
                @_tag ?= CK.Model.awake.tags.get @get('tag').id

            

        class @Investigation extends @db.Document('investigations')
            _.extend(@prototype, VotableMixin.prototype)
            _.extend(@prototype, BuildOnableMixin.prototype)

            validate: (attrs) ->
                unless _.all(attrs.authors, (a) -> typeof a is 'string')
                    return "'authors' must be an array of strings but is #{JSON.stringify(attrs.authors)}"

            addAuthor: (username) ->
                authors = _.clone @get('authors')
                authors.push(username)
                @set 'authors', authors

            removeAuthor: (username) ->
                authors = _.without @get('authors'), username
                @set 'authors', authors

            hasAuthor: (username) ->
                _.contains @get('authors'), username

            getProposal: ->
                return null unless @get('proposal_id')
                # memoize
                @_proposal ?= CK.Model.awake.proposals.get @get('proposal_id')

            getTag: ->
                @getProposal().getTag()

        class @Contributions extends @db.Collection('contributions')
            model: CK.Model.Contribution

        class @Proposals extends @db.Collection('proposals')
            model: CK.Model.Proposal

        class @Investigations extends @db.Collection('investigations')
            model: CK.Model.Investigation

        class @Tag extends @db.Document('tags')

        class @Tags extends @db.Collection('tags')
            model: CK.Model.Tag

        class @State extends @db.Document('states')

        class @States extends @db.Collection('states')
            model: CK.Model.State

    @initWakefulCollections = (wakefulUrl) ->
        deferreds = []

        camelCase = (str) ->
            str.replace(/([\-_][a-z]|^[a-z])/g, ($1) -> $1.toUpperCase().replace(/[\-_]/,''))

        @awake = {}

        for collName in @requiredCollections
            coll = new @[camelCase(collName)]()
            coll.wake wakefulUrl
            @awake[collName] = coll
            deferreds.push coll.fetch()

        jQuery.when.apply jQuery, deferreds
            
