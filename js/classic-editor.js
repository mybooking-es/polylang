/**
 * @package Polylang
 */

// tag suggest in metabox
jQuery(
	function( $ ) {
		$.ajaxPrefilter(
			function( options, originalOptions, jqXHR ) {
				var lang = $( '.post_lang_choice' ).val();
				if ( 'string' === typeof options.data && -1 !== options.url.indexOf( 'action=ajax-tag-search' ) && lang ) {
					options.data = 'lang=' + lang + '&' + options.data;
				}
			}
		);
	}
);

// overrides tagBox.get
jQuery(
	function( $ ) {
		// overrides function to add the language
		tagBox.get = function( id ) {
			var tax = id.substr( id.indexOf( '-' ) + 1 );

			// add the language in the $_POST variable
			var data = {
				action: 'get-tagcloud',
				lang:   $( '.post_lang_choice' ).val(),
				tax:    tax
			}

			$.post(
				ajaxurl,
				data,
				function( r, stat ) {
					if ( 0 == r || 'success' != stat ) {
						r = wpAjax.broken;
					}

					// @see code from WordPress core https://github.com/WordPress/WordPress/blob/5.2.2/wp-admin/js/tags-box.js#L291
					// @see wp_generate_tag_cloud function which generate the escaped HTML https://github.com/WordPress/WordPress/blob/a02b5cc2a8eecb8e076fbb7cf4de7bd2ec8a8eb1/wp-includes/category-template.php#L966-L975
					r = $( '<div />' ).addClass( 'the-tagcloud' ).attr( 'id', 'tagcloud-' + tax ).html( r ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
					$( 'a', r ).click(
						function(){
							tagBox.flushTags( $( this ).closest( '.inside' ).children( '.tagsdiv' ), this );
							return false;
						}
					);

					var tagCloud = $( '#tagcloud-' + tax );
					// add an if else condition to allow modifying the tags outputed when switching the language
					var v = tagCloud.css( 'display' );
					if ( v ) {
						// See the comment above when r variable is created.
						$( '#tagcloud-' + tax ).replaceWith( r ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.replaceWith
						$( '#tagcloud-' + tax ).css( 'display', v );
					}
					else {
						// See the comment above when r variable is created.
						$( '#' + id ).after( r ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.after
					}
				}
			);
		}
	}
);

jQuery(
	function ( $ ) {
		// collect taxonomies - code partly copied from WordPress
		var taxonomies = new Array();
		$( '.categorydiv' ).each(
			function(){
				var this_id = $( this ).attr( 'id' ), taxonomyParts, taxonomy;

				taxonomyParts = this_id.split( '-' );
				taxonomyParts.shift();
				taxonomy = taxonomyParts.join( '-' );
				taxonomies.push( taxonomy ); // store the taxonomy for future use

				// add our hidden field in the new category form - for each hierarchical taxonomy
				// to set the language when creating a new category
				// html code inserted come from html code itself.
				$( '#' + taxonomy + '-add-submit' ).before( // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.before
					$( '<input />' ).attr( 'type', 'hidden' )
						.attr( 'id', taxonomy + '-lang' )
						.attr( 'name', 'term_lang_choice' )
						.attr( 'value', $( '.post_lang_choice' ).val() )
				);
			}
		);

		// ajax for changing the post's language in the languages metabox
		$( '.post_lang_choice' ).change(
			function() {
				var value = $( this ).val();
				var lang  = $( this ).children( 'option[value="' + value + '"]' ).attr( 'lang' );
				var dir   = $( '.pll-translation-column > span[lang="' + lang + '"]' ).attr( 'dir' );

				var data = {
					action:     'post_lang_choice',
					lang:       value,
					post_type:  $( '#post_type' ).val(),
					taxonomies: taxonomies,
					post_id:    $( '#post_ID' ).val(),
					_pll_nonce: $( '#_pll_nonce' ).val()
				}

				$.post(
					ajaxurl,
					data,
					function( response ) {
						var res = wpAjax.parseAjaxResponse( response, 'ajax-response' );
						$.each(
							res.responses,
							function() {
								switch ( this.what ) {
									case 'translations': // translations fields
										// Data is built and come from server side and is well escaped when necessary
										$( '.translations' ).html( this.data ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
										init_translations();
									break;
									case 'taxonomy': // categories metabox for posts
										var tax = this.data;
										// @see wp_terms_checklist https://github.com/WordPress/WordPress/blob/5.2.2/wp-admin/includes/template.php#L175
										// @see https://github.com/WordPress/WordPress/blob/5.2.2/wp-admin/includes/class-walker-category-checklist.php#L89-L111
										$( '#' + tax + 'checklist' ).html( this.supplemental.all ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
										// @see wp_popular_terms_checklist https://github.com/WordPress/WordPress/blob/5.2.2/wp-admin/includes/template.php#L236
										$( '#' + tax + 'checklist-pop' ).html( this.supplemental.populars ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
										// @see wp_dropdown_categories https://github.com/WordPress/WordPress/blob/5.5.1/wp-includes/category-template.php#L336
										// which is called by PLL_Admin_Classic_Editor::post_lang_choice to generate supplemental.dropdown
										$( '#new' + tax + '_parent' ).replaceWith( this.supplemental.dropdown ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.replaceWith
										$( '#' + tax + '-lang' ).val( $( '.post_lang_choice' ).val() ); // hidden field
									break;
									case 'pages': // parent dropdown list for pages
										// @see wp_dropdown_pages https://github.com/WordPress/WordPress/blob/5.2.2/wp-includes/post-template.php#L1186-L1208
										// @see https://github.com/WordPress/WordPress/blob/5.2.2/wp-includes/class-walker-page-dropdown.php#L88
										$( '#parent_id' ).html( this.data ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
									break;
									case 'flag': // flag in front of the select dropdown
										// Data is built and come from server side and is well escaped when necessary
										$( '.pll-select-flag' ).html( this.data ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
									break;
									case 'permalink': // Sample permalink
										var div = $( '#edit-slug-box' );
										if ( '-1' != this.data && div.children().length ) {
											// @see get_sample_permalink_html https://github.com/WordPress/WordPress/blob/5.2.2/wp-admin/includes/post.php#L1425-L1454
											div.html( this.data ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
										}
									break;
								}
							}
						);

						// modifies the language in the tag cloud
						$( '.tagcloud-link' ).each(
							function() {
								var id = $( this ).attr( 'id' );
								tagBox.get( id );
							}
						);

						// Modifies the text direction
						$( 'body' ).removeClass( 'pll-dir-rtl' ).removeClass( 'pll-dir-ltr' ).addClass( 'pll-dir-' + dir );
						$( '#content_ifr' ).contents().find( 'html' ).attr( 'lang', lang ).attr( 'dir', dir );
						$( '#content_ifr' ).contents().find( 'body' ).attr( 'dir', dir );

						resetCurrentMediaFrame();
						resetFeaturedImage();
					}
				);
			}
		);

		// translations autocomplete input box
		function init_translations() {
			$( '.tr_lang' ).each(
				function(){
					var tr_lang = $( this ).attr( 'id' ).substring( 8 );
					var td = $( this ).parent().parent().siblings( '.pll-edit-column' );

					$( this ).autocomplete(
						{
							minLength: 0,
							source: ajaxurl + '?action=pll_posts_not_translated' +
								'&post_language=' + $( '.post_lang_choice' ).val() +
								'&translation_language=' + tr_lang +
								'&post_type=' + $( '#post_type' ).val() +
								'&_pll_nonce=' + $( '#_pll_nonce' ).val(),
							select: function( event, ui ) {
								$( '#htr_lang_' + tr_lang ).val( ui.item.id );
								// ui.item.link is built and come from server side and is well escaped when necessary
								td.html( ui.item.link ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
							},
						}
					);

					// when the input box is emptied
					$( this ).on(
						'blur',
						function() {
							if ( ! $( this ).val() ) {
								$( '#htr_lang_' + tr_lang ).val( 0 );
								// Value is retrieved from HTML already generated server side
								td.html( td.siblings( '.hidden' ).children().clone() ); // phpcs:ignore WordPressVIPMinimum.JS.HTMLExecutingFunctions.html
							}
						}
					);
				}
			);
		}

		init_translations();
	}
);

/**
 * @since 3.0
 */
function resetFeaturedImage() {
	if (wp.media.featuredImage && wp.media.featuredImage._frame) { // Check the property rather than calling to the function that will instantiate a wp.media.view.MediaFrame.Select object. 
		if (wp.media.featuredImage._frame._selection && wp.media.featuredImage._frame._selection.attachments instanceof wp.media.model.Attachments) {
				wp.media.featuredImage._frame._selection.attachments.reset();
		}

		if (wp.media.frame !== wp.media.featuredImage._frame) {
			resetMediaFrame( wp.media.featuredImage._frame );
		}
	}
}

/**
 * @since 3.0
 */
function resetCurrentMediaFrame() {
	if (wp.media.frame) {
		resetMediaFrame( wp.media.frame );
	}
}

/**
 * @since 3.0
 * 
 * Third party plugins may break the dependency tree, so each subcomponent existence is checked.
 */
function resetMediaFrame(frame) {
	if (frame.views instanceof wp.Backbone.Subviews) {
		var attachmentsBrowser = frame.views.get( '.media-frame-content' );
		if (attachmentsBrowser) {
			var attachmentsView = attachmentsBrowser[0].attachments;
			if (attachmentsView) {
				var attachmentsCollection = attachmentsView.collection;
				if (attachmentsCollection.mirroring) {
					attachmentsCollection.mirroring._hasMore = true;
				}
				attachmentsCollection.reset();
			}
		}
	}
}

