class CK.Smartboard.View.Balloon extends CK.Smartboard.View.Base

    initialize: ->
        super()

        # These make it possible to get and set the balloon's CSS properties by doing stuff like:
        #
        #   console.log(ballonView.right)
        #   ballonView.left = 500
        #   ballonView.top += 10
        #
        # For more info on how this works, see:
        # https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty
        #
        # TODO: this is too slow/inefficient to use in something like collision detection, due to the underlying DOM lookups
        Object.defineProperty this, 'pos',
            get: => @$el.position()
            set: (pos) => @$el.css(left: pos.left + 'px', top: pos.top + 'px')

        Object.defineProperty this, 'left',
            get: => @pos.left
            set: (x) => @$el.css('left', x + 'px')
        Object.defineProperty this, 'top',
            get: => @pos.top
            set: (y) => @$el.css('top', y + 'px')

        Object.defineProperty this, 'width',
            get: => @$el.outerWidth()
            set: (w) => @$el.css('width', w + 'px')
        Object.defineProperty this, 'height',
            get: => @$el.outerHeight()
            set: (h) => @$el.css('height', h + 'px')

        Object.defineProperty this, 'right',
            get: => @left + @width
            set: (x) => @$el.css('left', (x - @width) + 'px')
        Object.defineProperty this, 'bottom',
            get: => @top + @height
            set: (y) => @$el.css('top', (y - @height) + 'px')


        @model.on 'change:published', =>
            if @model.get('published')
                @$el.addClass('new')
                setTimeout(=>
                        @$el.removeClass('new')
                    , 1001
                )

                # only bind this after published...
                # highlight only on changes coming in from wakeful, not self changes
                @model.on 'wakeful:broadcast:received', =>
                    unless @$el.hasClass('glow') # don't glow if we're already glowing
                        @$el.addClass('glow')
                        setTimeout(=>
                                @$el.removeClass('glow')
                            , 4001
                        )

        @model.on 'change', =>
            @render() if @wall? # don't try to render until we've been properly added (wtf indeed)


    # true if this balloon has been added to the DOM, false otherwise
    isInDOM: ->
        jQuery.contains(document.documentElement, @el)

    # true if this balloon has a position in the wall
    isPositioned: ->
        pos = @pos
        pos.left? && pos.left > 0

    renderConnector: (toDoc) ->
        toId = toDoc.id.toLowerCase()
        toView = @wall.balloonViews[toId]
        

        connectorId = @model.id + "-" + toId

        connector = CK.Smartboard.View.findOrCreate @wall.$el, "##{connectorId}",
            "<div class='connector #{@BALLOON_TYPE}-connector' id='#{connectorId}'></div>"

        unless toView? && @$el.is(':visible')
            # tag hasn't been rendered yet... we'll skip it for now
            connector.remove() # this may be expensive (since it'll have to be re-added)
            return

        x1 = @left + (@width/2)
        y1 = @top + (@height/2)
        x2 = toView.left + (toView.width/2)
        y2 = toView.top + (toView.height/2)

        connectorLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

        connectorTransform =
            "rotate(" + ((Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) ) + "deg)"

        connector.css
            'top': "#{y1}px"
            'left': "#{x1}px"
            'width': "#{connectorLength}px"
            '-webkit-transform': connectorTransform
            '-moz-transform': connectorTransform
            'transform': connectorTransform

        connector.addClass "connects-#{@model.id}"
        connector.addClass "connects-#{toId}"

        if toDoc instanceof CK.Model.Tag
            connector.addClass "tag-#{toId}" # used for Wall's @tagFilters

        if toDoc.getTag? # used for interestGroup board filtering
            ig = toDoc.getTag()
            connector.addClass "ig-#{ig.id}"

        return connector # for additional manipulation in subclasses


    render: =>
        @pos = @model.get('pos') if @model.has('pos')
        @$el.zIndex( @model.get('z-index') ) if @model.has('z-index')

class CK.Smartboard.View.ContentBalloon extends CK.Smartboard.View.Balloon
    tagName: 'article content'

    id: => @domID()

    # setColorClass: (colorClass) =>
    #     @colorClass = colorClass


    constructor: (options) ->
        super(options)

    initialize: ->
        super()

    events:
        # 'mousedown': (ev) -> @moveToTop()

        'dblclick': 'handleClick'


    handleClick: =>
        #jQuery('.contribution').not("##{@model.id}")

        if @$el.hasClass('.ui-draggable-dragging')
            return # prevent unwanted click action while dragging

        @$el.toggleClass('opened')

        # need to update connectors since balloon height probably changed
        @renderConnectors() if @renderConnectors?
        

    render: =>
        super()

        if @model.get 'published'
            @$el.removeClass 'unpublished'
        else
            @$el.addClass 'unpublished'

        @$el.addClass('content')

        headline = @findOrCreate '.headline',
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        @body = @findOrCreate '.body',
            "<div class='body'></div>"

        @meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        @meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")

        @renderBuildons()
        #@processContributionByType()

        return this # return this for chaining

    renderBodypart: (part, content) ->
        # skip if content is all whitespace
        return if !content or content.match(/^\s+$/g)

        humanPart = part.replace('_', ' ')

        partContainer = CK.Smartboard.View.findOrCreate @body, ".#{part}",
            "<div class='bodypart #{part}'>
                <h5>#{humanPart}</h5>
                <div class='part-content'></div>
            </div>"

        partContainer.find('.part-content').text(content)
            

    renderBuildons: =>
        return unless @model.has('build_ons')

        buildons = @model.get('build_ons')

        return unless buildons.length > 0

        return unless _.any(buildons, (b) => b.published)

        container = @findOrCreate '.buildons',
            "<div class='buildons'></div>"

        changed = false
        if buildons.length isnt container.find('div.buildon').length
            changed = true

        container.children('div.buildon').remove()

        counter = CK.Smartboard.View.findOrCreate @$el.find('.meta'), '.buildon-counter',
            "<div class='buildon-counter'></div>"
        counter.html('')

        for b in buildons
            continue unless b.published

            counter.append("•")

            $b = jQuery("
                <div class='buildon'>
                    <div class='author'></div>
                    <div class='content'></div>
                </div>
            ")
            $b.find('.author').text(b.author)
            $b.find('.content').text(b.content)
            container.append $b

        # if changed
        #     @$el.effect('highlight', 2000)

    renderVotes: ->
        return unless @model.has('votes')

        votes = @model.get('votes')

        return unless votes?

        container = @findOrCreate '.votes',
            "<div class='votes'></div>"

        if @model instanceof CK.Model.Proposal
            container.addClass('proposal-votes')
        
        if @model instanceof CK.Model.Investigation
            container.addClass('investigation-votes')

        voteCount = votes.length

        if voteCount is 0
            container.addClass('off')
            container.text('')
        else
            container.removeClass('off')
            container.text(voteCount)



class CK.Smartboard.View.ContributionBalloon extends CK.Smartboard.View.ContentBalloon
    BALLOON_TYPE: 'contribution'
    className: 'contribution balloon'

    initiaialize: ->
        @model.on 'change:tags', =>
            @renderConnectors()

    render: ->
        super()

        @renderConnectors()
        @renderTags()

        @$el.addClass('contribution')
        
        @body.text @model.get('content')
    
    renderConnectors: =>
        return if not @model.has('tags') or
            _.isEmpty(@model.get('tags')) or
            not @$el.is(':visible')

        for tag in @model.get('tags')
            @renderConnector(tag)

    renderTags: =>
        # tagsContainer = @findOrCreate '.tags',
        #     "<div class='tags'></div>"

        return unless @model.has('tags')

        # validTagClasses = []
        # for tagText in @model.get('tags')
        #     # hacky way to convert the tag into something that can be used as a CSS clas
        #     md5tag = MD5.hexdigest(tagText)
        #     tagClass = "tag-#{md5tag}"
        #     validTagClasses.push tagClass
        #     tagSpan = CK.Smartboard.View.findOrCreate tagsContainer, ".#{tagClass}",
        #         "<span class='tag #{tagClass}></span>"
        #     tagSpan.text tagText

        # # now remove tags that are no longer present in the model
        # tagsContainer.find('.tag').not(validTagClasses.join(",")).remove()

        tagIds = (tag.id for tag in @model.get('tags'))

        @$el.attr('data-tags', tagIds.join(" "))

        for tid in tagIds
            @$el.addClass("tag-#{tid}")
        #TODO: remove removed tags

        return this # return this for chaining
    

class CK.Smartboard.View.ProposalBalloon extends CK.Smartboard.View.ContentBalloon
    className: 'proposal balloon'
    BALLOON_TYPE: 'proposal'

    initialize: ->
        super()
        @model.on 'change:votes', =>
            @$el.find('.votes').addClass('changed')
            setTimeout (=> @$el.find('.votes').removeClass 'changed'),
                1001

    render: ->
        super()

        @renderConnectors()
        @renderVotes()

        @$el.addClass('proposal')

        if @model.has 'tag'
            tag = @model.get('tag')
            @$el.addClass "ig-"+tag.id
            @$el.addClass @model.getColorClass()
            @$el.addClass("tag-#{tag.id}")

        @renderBodypart 'proposal', @model.get('proposal')
        @renderBodypart 'justification', @model.get('justification')

    renderConnectors: ->
        @renderConnector(@model.get 'tag') if @model.has 'tag'

        # FIXME: this is inefficient... consider
        #           adding an 'investigations' property to
        #           proposals
        investigations = CK.Model.awake.investigations.filter (inv) =>
            inv.get('proposal_id') is @model.id

        for inv in investigations
            bv = @wall.balloonViews[inv.id]
            if bv?
                bv.renderConnector(@model)


class CK.Smartboard.View.InvestigationBalloon extends CK.Smartboard.View.ContentBalloon
    className: 'investigation balloon'
    BALLOON_TYPE: 'investigation'

    initialize: ->
        super()
        @model.on 'change:votes', =>
            @$el.find('.votes').addClass('changed')
            setTimeout (=> @$el.find('.votes').removeClass 'changed'),
                1001

    render: ->
        invType = @findOrCreate '.investigation-type',
            "<h2 class='investigation-type'></h2>"

        invType.text(@model.get 'type')

        super()

        @renderVotes()
        @renderBuildons()

        unless @model.has 'proposal_id'
            throw "Investigation##{@model.id} has no proposal_id!"

        prop = @model.getProposal()

        unless prop?
            return
            #throw "Investigation##{@model.id} has is connected to a proposal that does not exist!"

        @$el.addClass "proposal-#{prop.id}"
        @$el.addClass prop.getColorClass()

        tag = @model.getTag()
        if tag?
            @$el.addClass "ig-"+tag.id

        @$el.addClass("investigation-#{@model.get('type')}")

        auth = @meta.find('.author')
        
        auth.text(@model.get('authors').join(" "))
        for author in @model.get('authors')
            auth.addClass("author-#{author}")

        @renderConnectors()

        possibleBodyparts = [
            'new_information',
            'references',
            'question',
            'hypothesis',
            'method',
            'results',
            'conclusions',
        ]

        for part in possibleBodyparts when @model.has(part)
            @renderBodypart part, @model.get(part)


    renderConnectors: =>
        prop = @model.getProposal()
        return unless prop?
        @renderConnector(prop)


class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Balloon
    tagName: 'div'
    className: 'tag balloon'
    BALLOON_TYPE: 'contribution'

    id: => @domID()

    initialize: ->
        super()
    
    setColorClass: (className) =>
        @$el.addClass(className)

    events:

        'click': 'handleClick'

    # makeDraggable: =>
    #     super()
    #     @$el.on 'drag', (ev, ui) =>
    #         @renderConnectors()

    handleClick: (ev) ->
        #$el = jQuery(ev.target)
        $el = @$el

        if @$el.hasClass('.ui-draggable-dragging')
            return # prevent unwanted click action while dragging

        console.log('clicked tag..')
        if $el.hasClass('active')
            Sail.app.wall.removeTagFilter(@model)
            $el.removeClass('active')
        else
            Sail.app.wall.addTagFilter(@model)
            $el.addClass('active')


    renderConnectors: =>
        taggedContributionViews = _.filter @wall.balloonViews, (bv) =>
            switch
                when bv.model instanceof CK.Model.Contribution
                    bv.$el.is(':visible') and
                        bv.model.hasTag(@model)
                when bv.model instanceof CK.Model.Proposal
                    bv.$el.is(':visible') and
                        bv.model.has('tag') and
                        bv.model.get('tag').id is @model.id
        
        for cv in taggedContributionViews
            cv.renderConnectors()

    render: =>
        super()

        @$el.addClass('tag')

        # if @model.has('colorClass')
        #     @$el.addClass @model.get('colorClass')

        name = @findOrCreate '.name',
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        if @model.has('colorClass')
            @setColorClass(@model.get('colorClass'))

        if @model.get('pinned')
            @$el.addClass('pinned')
        else
            @$el.removeClass('pinned')

        @renderConnectors()

        return this # return this for chaining
